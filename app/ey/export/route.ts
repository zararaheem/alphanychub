import { requireMember } from "@/lib/access";
import {
  GRADE_LABEL, MODE_LABEL, WEEKDAY, label, modeFor, morningModeFor, nyDate,
  type DayMode, type Mode, type Part,
} from "@/lib/ey";
import { createClient } from "@/lib/supabase/server";
import { buildXlsx } from "@/lib/xlsx";

// /ey/export?day=YYYY-MM-DD&level=PK|K: the day's arrival and dismissal list
// plus everyone's usual travel, as an Excel workbook.
export async function GET(req: Request) {
  await requireMember();
  const url = new URL(req.url);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("day") ?? "") ? url.searchParams.get("day")! : nyDate();
  const level = url.searchParams.get("level");
  const supabase = await createClient();

  const [s, t, d, c] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, grade").eq("campus", "early-years"),
    supabase.from("ey_travel").select("student_id, mode, afterschool_days, walker_days, bus_route"),
    supabase.from("ey_travel_day").select("student_id, part, mode, note, updated_by").eq("day", day),
    supabase.from("ey_checks").select("student_id, step, at, by_email").eq("day", day),
  ]);
  if (s.error) return new Response("Couldn't load the list.", { status: 500 });

  const travel = new Map((t.data ?? []).map((r) => [r.student_id, r]));
  const change = (id: number, part: Part) => (d.data ?? []).find((r) => r.student_id === id && r.part === part);
  const time = (id: number, step: string) => {
    const at = (c.data ?? []).find((r) => r.student_id === id && r.step === step)?.at;
    return at ? new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
  };
  const kids = (s.data ?? [])
    .filter((k) => !level || k.grade === level)
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
    .map((k) => {
      const tr = travel.get(k.id);
      const row = {
        usual: (tr?.mode ?? null) as Mode | null, afterschool_days: (tr?.afterschool_days ?? []) as number[],
        walker_days: (tr?.walker_days ?? []) as number[],
        today: (change(k.id, "pm")?.mode ?? null) as DayMode | null, today_am: (change(k.id, "am")?.mode ?? null) as DayMode | null,
      };
      return { ...k, ...row, bus_route: tr?.bus_route ?? "", am: morningModeFor(row, day), pm: modeFor(row, day) };
    });
  const grade = (g: string | null) => (g ? GRADE_LABEL[g] ?? g : "");
  const dayName = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  const today = [
    ["Last name", "First name", "Grade", "Morning", "At Maiden Ln", "At William St", "Dismissal", "Bus route", "Left William St", "Gone home", "Change today", "Changed by"],
    ...kids.map((k) => {
      const ch = change(k.id, "pm") ?? change(k.id, "am");
      return [
        k.last_name, k.first_name, grade(k.grade),
        k.am ? label(k.am, "am") : "Not set", time(k.id, "am_maiden"), time(k.id, "am_here"),
        k.pm ? label(k.pm, "pm") : "Not set", k.pm === "bus" ? k.bus_route : "",
        time(k.id, "pm_left"), time(k.id, "pm_done"),
        ch ? [label(ch.mode as DayMode, ch.part as Part), ch.note].filter(Boolean).join(": ") : "", ch?.updated_by ?? "",
      ];
    }),
  ];
  const usual = [
    ["Last name", "First name", "Grade", "Usual travel", "Bus route", "Walks via Maiden Ln on", "Afterschool"],
    ...kids.map((k) => [
      k.last_name, k.first_name, grade(k.grade),
      k.usual ? MODE_LABEL[k.usual] : "Not set", k.usual === "bus" ? k.bus_route : "",
      k.usual === "walker" ? "Every day" : k.walker_days.map((x) => WEEKDAY[x]).join(", "),
      k.afterschool_days.map((x) => WEEKDAY[x]).join(", "),
    ]),
  ];

  const file = buildXlsx([
    { name: dayName.replace(/,/g, ""), rows: today, widths: [16, 16, 7, 16, 12, 13, 18, 26, 14, 11, 40, 20] },
    { name: "Usual travel", rows: usual, widths: [16, 16, 7, 22, 26, 22, 18] },
  ]);
  const fname = `EY attendance ${day}${level ? ` ${GRADE_LABEL[level] ?? level}` : ""}.xlsx`;
  return new Response(new Blob([file as BlobPart]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
