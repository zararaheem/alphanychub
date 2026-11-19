import { createClient as createSupabase } from "@supabase/supabase-js";
import {
  AFTERSCHOOL_DAYS, BUS_ROUTES, MODE_LABEL, dayLabel, daysLabel, label, modeFor, morningModeFor, nyDate, studentName, weekdayOf,
  type DayMode, type Mode, type Parsed, type Part, type RosterRow,
} from "@/lib/ey";

// Slack and the Parent Hub have no staff session, so they go through two
// database functions that check EY_SLACK_TOKEN instead.
function db() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const token = () => process.env.EY_SLACK_TOKEN ?? "";

export async function eyRoster(day: string): Promise<RosterRow[]> {
  const { data, error } = await db().rpc("ey_roster2", { p_token: token(), p_day: day });
  if (error) throw new Error(error.message);
  return (data ?? []) as RosterRow[];
}

async function set(ids: number[], mode: string, day: string | null, by: string, note: string | null, days?: number[], part: Part | null = "pm") {
  const { error } = await db().rpc("ey_slack_set", {
    p_token: token(), p_ids: ids, p_mode: mode, p_day: day, p_by: by, p_note: note, p_days: days ?? null, p_part: part,
  });
  if (error) throw new Error(error.message);
}

// Saves a parsed update and returns a one-line confirmation for Slack.
export async function applyUpdate(p: Extract<Parsed, { kind: "set" }>, roster: RosterRow[], by: string): Promise<string> {
  const rows = roster.filter((r) => p.ids.includes(r.id));
  const names = rows.map((r) => `*${studentName(r)}*`).join(", ");
  const today = nyDate();

  if (p.day === null && p.mode === "afterschool") {
    await set(p.ids, "afterschool", null, by, null, p.days);
    return `✅ ${names}: afterschool on ${daysLabel(p.days ?? [])} from now on.`;
  }
  if (p.day === null && p.mode === "walker" && p.days) {
    const { error } = await db().rpc("ey_set_walker_days", { p_token: token(), p_ids: p.ids, p_days: p.days, p_by: by });
    if (error) throw new Error(error.message);
    return p.days.length
      ? `✅ ${names}: walks on ${daysLabel(p.days)}. Other days: ${rows.map((r) => MODE_LABEL[r.usual ?? "parent"]).join(", ")}.`
      : `✅ ${names}: no set walking days.`;
  }
  if (p.day === null) {
    await set(p.ids, p.mode, null, by, null);
    return `✅ ${names}: usually *${MODE_LABEL[p.mode as Mode]}* from now on.`;
  }
  const when = (part: Part | null | undefined) => (part === "am" ? " (morning)" : part === "pm" ? " (dismissal)" : "");
  if (p.mode === "usual") {
    await set(p.ids, "usual", p.day, by, null, undefined, p.part ?? null);
    const back = rows.map((r) => `${studentName(r)}: ${MODE_LABEL[modeFor({ ...r, today: null }, p.day!) ?? "parent"]}`).join(", ");
    return `↩️ Change cleared for ${dayLabel(p.day, today)}${when(p.part)}. Back to usual: ${back}.`;
  }
  if (p.mode === "home") {
    // Their usual way home, skipping afterschool.
    const groups = new Map<DayMode, number[]>();
    for (const r of rows) { const m = r.usual ?? "parent"; groups.set(m, [...(groups.get(m) ?? []), r.id]); }
    for (const [m, ids] of groups) await set(ids, m, p.day, by, p.note);
    return `✅ ${names}: no afterschool ${dayLabel(p.day, today)}. Going home as usual (${rows.map((r) => MODE_LABEL[r.usual ?? "parent"]).join(", ")}).`;
  }

  const part: Part = p.part === "am" ? "am" : "pm";
  await set(p.ids, p.mode, p.day, by, p.note, undefined, p.part === undefined ? "pm" : p.mode === "absent" ? null : part);
  const was = rows.map((r) => (part === "am" ? r.usual : modeFor({ ...r, today: null }, p.day!))).filter(Boolean) as DayMode[];
  const usual = p.mode !== "absent" && was.length && was.every((m) => m === was[0]) ? ` · usually ${label(was[0], part)}` : "";
  let line = `✅ ${names}: *${label(p.mode, part)}* ${dayLabel(p.day, today)}${p.mode === "absent" ? " (all day)" : when(part)}${usual}`;
  if (p.mode === "afterschool" && !AFTERSCHOOL_DAYS.includes(weekdayOf(p.day))) line += "\n⚠️ Afterschool only runs Mon–Thu.";
  if (p.day === today && nowMinutes() >= 15 * 60) line += "\n⚠️ Dismissal has started. Tell the team by radio too.";
  return line;
}

function nowMinutes() {
  const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }).split(":").map(Number);
  return h * 60 + m;
}

// The day at a glance, grouped by how each child goes home.
export function summary(roster: RosterRow[], day: string): string {
  const groups: Record<string, string[]> = { walker: [], bus: [], parent: [], early: [], afterschool: [], absent: [], unset: [], late: [] };
  for (const r of roster) {
    const m = modeFor(r, day) ?? "unset";
    const key = m === "bus" ? `bus:${r.bus_route && BUS_ROUTES.includes(r.bus_route) ? r.bus_route : ""}` : m;
    (groups[key] ??= []).push(`${studentName(r)}${r.today ? " _(change)_" : ""}`);
    if (morningModeFor(r, day) === "late") groups.late.push(studentName(r));
  }
  const line = (k: string, label: string) => (groups[k]?.length ? `*${label} (${groups[k].length}):* ${groups[k].join(", ")}` : null);
  return [
    `*Early Years dismissal · ${dayLabel(day)}*`,
    line("walker", "Walkers · leave 3:15 for Maiden Ln"),
    ...BUS_ROUTES.map((r) => line(`bus:${r}`, `Bus · ${r}`)),
    line("bus:", "Bus · route not set"),
    line("parent", "Parent pickup"),
    line("early", "Early pickup"),
    line("afterschool", "Afterschool · 3:45–4:45"),
    line("absent", "Absent"),
    line("late", "Arrived late"),
    line("unset", "Not set yet"),
  ].filter(Boolean).join("\n");
}

export const HELP = [
  "*Early Years attendance in Slack.* Type `/ey` and then a message:",
  "• `/ey Luna parent pickup today`  ·  `/ey Zen bus tomorrow`  ·  `/ey Molly absent`",
  "• Mornings: `/ey Gia mom dropping her off`  ·  `/ey Sasha arriving late 9:30`",
  "• `/ey Chloe early pickup 1:30`",
  "• `/ey Ella afterschool today`  ·  `/ey Ella not staying for afterschool`",
  "• `/ey Armie is a walker` or `/ey Armie bus always` sets how they usually go home",
  "• `/ey Ella afterschool every Mon Wed` sets their afterschool days",
  "• `/ey Sasha walks Mon and Wed` sets the days they walk via Maiden Ln",
  "• `/ey Luna back to usual` clears today's change",
  "• `/ey today` (or `tomorrow`) lists everyone",
  "Got a WhatsApp from a parent? Paste it straight in: `/ey Hi! Luna's aunt Maria will pick her up today`",
].join("\n");

// A Parent Hub pickup form for an Early Years child updates that day's dismissal.
// Returns what changed, or null when the form doesn't map to a way home.
export async function applyParentHubPickup(student: string, details: Record<string, string>, from: string): Promise<string | null> {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(details.date ?? "") ? details.date : null;
  if (!day) return null;
  const plain = (s: string) => s.replace(/\(.*?\)/g, " ").toLowerCase().replace(/[^a-z]+/g, " ").trim();
  const roster = await eyRoster(day);
  const kid = roster.find((r) => plain(studentName(r)) === plain(student))
    ?? roster.find((r) => plain(student).includes(plain(r.last_name)) && plain(student).includes(plain(r.first_name).split(" ")[0]));
  if (!kid) return null;
  const by = `${from} (Parent Hub)`;
  const extra = [details.pickup_person && `Picked up by ${details.pickup_person}`, details.pickup_phone, details.time && `at ${details.time}`, details.notes]
    .filter(Boolean).join(" · ");
  const map: Record<string, DayMode | "home"> = {
    "Someone else is picking up": "parent",
    "Early pickup": "early",
    "Riding a different bus": "bus",
    "Not taking the bus today": "parent",
    "Staying for afterschool": "afterschool",
    "Not staying for afterschool": "home",
  };
  const mode = map[details.change];
  if (!mode) return null;
  const note = `${details.change}${extra ? `: ${extra}` : ""}`.slice(0, 300);
  return applyUpdate({ kind: "set", ids: [kid.id], mode, day, note }, roster, by);
}
