// Early Years arrivals and dismissal: how each child travels, what changes
// today, and reading a plain Slack message ("Ada's aunt is picking her up
// today", a pasted WhatsApp) into an update.

export type Mode = "walker" | "bus" | "parent" | "afterschool";
// A change for one morning ("late") or one dismissal ("early" = early pickup).
export type DayMode = Mode | "absent" | "late" | "early";
export type Part = "am" | "pm";
export type Step = "am_maiden" | "am_here" | "pm_left" | "pm_done";

export const MODE_LABEL: Record<DayMode, string> = {
  walker: "Walker",
  bus: "Bus",
  parent: "Parent pickup",
  afterschool: "Afterschool",
  absent: "Absent",
  late: "Arriving late",
  early: "Early pickup",
};
// The same choice reads differently in the morning.
export const AM_LABEL: Partial<Record<DayMode, string>> = { parent: "Parent drop-off" };
export const label = (m: DayMode, part: Part) => (part === "am" ? AM_LABEL[m] : undefined) ?? MODE_LABEL[m];
export const AM_CHOICES: DayMode[] = ["walker", "bus", "parent", "late", "absent"];
export const PM_CHOICES: DayMode[] = ["walker", "bus", "parent", "afterschool", "early", "absent"];
export const BASE_MODES: Mode[] = ["walker", "bus", "parent"];
// Afterschool runs Mon–Thu, 3:45–4:45 PM.
export const AFTERSCHOOL_DAYS = [1, 2, 3, 4];
export const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type RosterRow = {
  id: number;
  first_name: string;
  last_name: string;
  usual: Mode | null; // walker / bus / parent
  afterschool_days: number[];
  today: DayMode | null; // that day's dismissal change
  today_am?: DayMode | null; // that day's morning change
  note?: string | null;
};

// Dates are New York dates, as YYYY-MM-DD.
export function nyDate(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dayLabel(day: string, today = nyDate()): string {
  const d = new Date(`${day}T12:00:00Z`);
  const nice = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return day === today ? `today (${nice})` : day === addDays(today, 1) ? `tomorrow (${nice})` : nice;
}
export const daysLabel = (days: number[]) => (days.length ? days.slice().sort().map((d) => WEEKDAY[d]).join(", ") : "none");

// How a child goes home on a given day: a one-day change wins, then their
// afterschool days, then their usual way home.
export function modeFor(r: Pick<RosterRow, "usual" | "afterschool_days" | "today">, day: string): DayMode | null {
  if (r.today) return r.today;
  const wd = weekdayOf(day);
  if (AFTERSCHOOL_DAYS.includes(wd) && r.afterschool_days.includes(wd)) return "afterschool";
  return r.usual;
}
// How they arrive: a morning change, or their usual way in.
export function morningModeFor(r: Pick<RosterRow, "usual" | "today_am">): DayMode | null {
  return r.today_am ?? r.usual;
}

export const studentName = (r: { first_name: string; last_name: string }) => `${r.first_name} ${r.last_name}`;

// ---------------------------------------------------------------- parsing

export type Parsed =
  | { kind: "help" }
  | { kind: "list"; day: string }
  | { kind: "error"; message: string }
  // "usual" undoes a one-day change; "home" is their usual way home (not afterschool) for that day.
  // part: the morning or dismissal (absent and "usual" with no part cover both).
  | { kind: "set"; ids: number[]; mode: DayMode | "usual" | "home"; day: string | null; days?: number[]; note: string; part?: Part | null };

// First names that are also everyday words only count when capitalized.
const WORDY = new Set(["will", "may", "june", "april", "august", "rose", "hope", "joy", "grace", "faith", "art", "bill", "sunny", "summer", "river", "sky", "mark", "pat", "ray", "dawn", "eve", "page", "chase"]);
const DAY_WORDS: Record<string, number> = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
// Capitalized everyday words that could start a name ("All" → Alida).
const NOT_NAMES = new Set(["all", "and", "the", "she", "her", "his", "they", "can", "not", "mom", "dad", "out", "hey", "please", "thanks", "today", "tomorrow", "after", "every", "back", "bus", "walk", "pick", "sick", "will", "just", "also", "our", "luke"]);
const LIST_WORDS = new Set(["today", "tomorrow", "list", "who", "whos", "who's", "is", "are", "status", "dismissal", "summary", "changes", "change", "walker", "walkers", "walking", "bus", "afterschool", "after", "school", "parent", "pickup", "absent", "the", "for", "on", "what", "all", "everyone", "kids"]);
const NEG = /\b(no|not|isn'?t|aren'?t|won'?t|wont|doesn'?t|don'?t|skip|skipping|cancel|cancell?ed|instead of)\b/;

const MODE_PATTERNS: [DayMode, RegExp][] = [
  ["absent", /\b(absent|sick|unwell|fever|not (coming|in)|staying home|home today|out today|off today|won'?t be (in|at school)|vacation|holiday)\b/g],
  ["late", /\b(late|running behind|arriv(e|es|ing) at|coming in at|in by)\b/g],
  ["early", /\b(early pick[\s-]?up|pick(ing|ed)? (her|him|them) up early|leav(e|es|ing) early|early dismissal|pick(ing)? up at (1|2|12|1[01])\b|out early)\b/g],
  ["afterschool", /\b(after[\s-]?school|aftercare|after[\s-]?care|extended day)\b/g],
  ["bus", /\bbus\b/g],
  ["walker", /\b(walker|walkers|walk|walking|walks|walk(ed)? over|maiden)\b/g],
  ["parent", /\b(pick(s|ing|ed)?[\s-]?(her|him|them)?[\s-]?up|pickup|parent|mom|mommy|mum|dad|daddy|mother|father|grandma|grandpa|grandmother|grandfather|nanny|aunt|uncle|babysitter|sitter|collect(s|ing|ed)?|drop(s|ping|ped)?[\s-]?(her|him|them)?[\s-]?off)\b/g],
];

function wordsOf(s: string) {
  return s.toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9\-\s/]/g, " ").split(/\s+/).filter(Boolean);
}

// Which Early Years children a message names.
export function findStudents(text: string, roster: Pick<RosterRow, "id" | "first_name" | "last_name">[]):
  { ids: number[]; ambiguous?: string; } {
  const words = new Set(wordsOf(text));
  const capitalized = new Set((text.match(/\b[A-Z][a-z]+/g) ?? []).map((w) => w.toLowerCase()));
  const byKey = new Map<string, typeof roster>();
  for (const s of roster) {
    const nick = /\(([^)]+)\)/.exec(s.first_name)?.[1];
    const firsts = s.first_name.replace(/\(.*?\)/, "").trim().split(/\s+/);
    const keys = [...firsts, nick].filter((k): k is string => !!k).map((k) => k.toLowerCase());
    for (const k of keys) {
      const hit = words.has(k) && (!WORDY.has(k) || capitalized.has(k));
      if (hit) byKey.set(k, [...(byKey.get(k) ?? []), s]);
    }
  }
  // Short names typed as names ("Alex" for Alexander), unless another child has exactly that name.
  const exact = new Set(roster.flatMap((s) => s.first_name.toLowerCase().replace(/[()]/g, " ").split(/\s+/)));
  for (const w of words) {
    if (w.length < 3 || !capitalized.has(w) || exact.has(w) || NOT_NAMES.has(w)) continue;
    for (const s of roster) {
      if (s.first_name.toLowerCase().startsWith(w)) byKey.set(w, [...(byKey.get(w) ?? []), s]);
    }
  }
  const ids = new Set<number>();
  for (const [k, list] of byKey) {
    const uniq = [...new Map(list.map((s) => [s.id, s])).values()];
    if (uniq.length === 1) { ids.add(uniq[0].id); continue; }
    // Same first name: the last name or its initial decides.
    const pick = uniq.filter((s) => {
      const last = s.last_name.toLowerCase();
      return last.split(/[\s-]+/).some((p) => words.has(p)) || words.has(last[0]) || words.has(`${last[0]}.`);
    });
    if (pick.length === 1) ids.add(pick[0].id);
    else return { ids: [], ambiguous: `More than one ${k[0].toUpperCase() + k.slice(1)}: ${uniq.map(studentName).join(" or ")}. Add the last name.` };
  }
  return { ids: [...ids] };
}

// The travel mode a message asks for, ignoring negated ones ("not taking the bus").
export function findMode(text: string): { mode: DayMode | null; negated: DayMode[] } {
  const t = text.toLowerCase();
  const found: DayMode[] = [];
  const negated: DayMode[] = [];
  for (const [mode, re] of MODE_PATTERNS) {
    for (const m of t.matchAll(re)) {
      const before = t.slice(Math.max(0, (m.index ?? 0) - 24), m.index).split(/[.,;!?]/).pop() ?? "";
      if (NEG.test(before)) negated.push(mode);
      else found.push(mode);
    }
  }
  const order: DayMode[] = ["absent", "late", "early", "afterschool", "bus", "walker", "parent"];
  const mode = order.find((m) => found.includes(m) && !negated.includes(m)) ?? null;
  return { mode, negated };
}

export function parseMessage(text: string, roster: RosterRow[], today = nyDate()): Parsed {
  const raw = text.trim();
  const t = raw.toLowerCase();
  if (!raw || /^(help|\?|how)\b/.test(t)) return { kind: "help" };

  // When: a date, a weekday, tomorrow, or today.
  let day: string | null = null;
  let explicitDay = false;
  if (/\btomorrow\b/.test(t)) { day = addDays(today, 1); explicitDay = true; }
  else if (/\b(today|tonight|this (morning|afternoon)|right now)\b/.test(t)) { day = today; explicitDay = true; }
  const md = /\b(\d{1,2})\/(\d{1,2})\b/.exec(t);
  if (!explicitDay && md) {
    const y = Number(today.slice(0, 4));
    const cand = `${y}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
    day = cand < addDays(today, -60) ? `${y + 1}${cand.slice(4)}` : cand;
    explicitDay = true;
  }
  const every = /\b(every|always|usually|normally|from now on|going forward|regularly|each)\b/.test(t) || /\b(mondays|tuesdays|wednesdays|thursdays|fridays)\b/.test(t);
  const weekdays = [...new Set(wordsOf(t).map((w) => DAY_WORDS[w.replace(/s$/, "")] ?? DAY_WORDS[w]).filter((d): d is number => d !== undefined))];
  if (!explicitDay && !every && weekdays.length === 1) {
    const wd = weekdays[0];
    const diff = (wd - weekdayOf(today) + 7) % 7;
    day = addDays(today, diff);
    explicitDay = true;
  }

  const { ids, ambiguous } = findStudents(raw, roster);
  if (ambiguous) return { kind: "error", message: ambiguous };
  const { mode, negated } = findMode(raw);
  const back = /\b(back to (usual|normal)|as usual|usual|normal|cancel (the )?change|never ?mind)\b/.test(t);

  if (!ids.length) {
    // "/ey today", "/ey who's walking tomorrow", "/ey friday": the list for that day.
    const listy = wordsOf(t).every((w) => LIST_WORDS.has(w) || DAY_WORDS[w] !== undefined || /^\d{1,2}\/\d{1,2}$/.test(w));
    if (listy) return { kind: "list", day: day ?? today };
    return { kind: "error", message: "I couldn't find a child's name in that. Try `/ey Luna bus today`." };
  }

  const note = raw.slice(0, 300);
  // Morning or dismissal: drop-off, arriving, late and "this morning" mean the morning.
  const amWords = /\b(morning|drop(s|ping|ped)?[\s-]?(her|him|them)?[\s-]?off|arriv\w*|coming in|bringing (her|him|them) in|in by)\b/.test(t);
  const part: Part | null = mode === "late" || (amWords && mode !== "early" && mode !== "afterschool") ? "am" : mode === "absent" ? null : "pm";
  if (back && !mode) return { kind: "set", ids, mode: "usual", day: day ?? today, note, part: amWords ? "am" : /\b(dismissal|pick|home)\b/.test(t) ? "pm" : null };

  // Afterschool on set weekdays ("every Mon and Wed"), or off altogether.
  if ((mode === "afterschool" || negated.includes("afterschool")) && every && !explicitDay) {
    const days = negated.includes("afterschool") && mode !== "afterschool" ? [] : (weekdays.length ? weekdays : AFTERSCHOOL_DAYS).filter((d) => AFTERSCHOOL_DAYS.includes(d));
    return { kind: "set", ids, mode: "afterschool", day: null, days, note };
  }

  let chosen: DayMode | "usual" | "home" | null = mode;
  // "Not staying for afterschool" with no other way given: their usual way home.
  if (!chosen && negated.includes("afterschool")) chosen = "home";
  else if (!chosen && negated.length) return { kind: "set", ids, mode: "usual", day: day ?? today, note, part };
  if (!chosen) return { kind: "error", message: "Walker, bus, parent pickup, afterschool, late, early pickup or absent? Try `/ey Luna parent pickup today`." };

  // Usual vs one day: "always"/"is a walker" set the usual; no day given and
  // no usual yet sets the usual; otherwise it's a change for today.
  const isA = /\b(is|are) (a |now a )?(walker|walkers|bus rider|bus kid)\b/.test(t);
  const usualWanted = (every || (isA && !explicitDay)) && (chosen === "walker" || chosen === "bus" || chosen === "parent");
  if (usualWanted) return { kind: "set", ids, mode: chosen, day: null, note };
  if (!explicitDay && part !== "am" && (chosen === "walker" || chosen === "bus" || chosen === "parent")) {
    const rows = roster.filter((r) => ids.includes(r.id));
    if (rows.length && rows.every((r) => !r.usual)) return { kind: "set", ids, mode: chosen, day: null, note };
  }
  return { kind: "set", ids, mode: chosen, day: day ?? today, note, part };
}
