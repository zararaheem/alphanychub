import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AREAS, DOMAINS, LEVEL, SKILL_LEVEL, addDays, goesBy, niceDay, weekLabel,
  type AreaId, type DomainId, type Level, type Observation, type Skill, type SkillLevel, type Work,
} from "@/lib/montessori";

// A child's week for their family: each day's lessons, where they are in each
// area, the skills they can show (as "I can" statements), what to work on at
// home, and the guide's message. Shared by the guide view and print/PDF.

export type Kid = { id: number; first_name: string; last_name: string; grade: string | null };
export type DayItem = { lesson: string; area: AreaId; level: Level | null; note: string | null; photos: string[]; ocr: string | null; highlight: boolean };
export type ParentReport = {
  kid: Kid; name: string; grade: string; monday: string; label: string; sample: boolean;
  note: string | null;
  days: { day: string; label: string; items: DayItem[] }[];
  areas: { id: AreaId; name: string; introduced: string[]; practiced: string[]; mastered: string[] }[];
  stats: { lessons: number; days: number; introduced: number; practiced: number; mastered: number };
  canDo: { domain: DomainId; domainName: string; items: { name: string; ican: string; level: SkillLevel }[] }[];
  growing: { name: string; ican: string; level: SkillLevel; home: string }[];
  highlights: DayItem[];
};

const GRADE: Record<string, string> = { PK: "PreK", K: "Kindergarten" };

export function assemble(kid: Kid, monday: string, works: Map<number, Work>, skills: Skill[], obs: Observation[], skillLevels: Map<number, SkillLevel>, note: string | null, sample: boolean): ParentReport {
  const item = (o: Observation): DayItem => {
    const w = o.work_id ? works.get(o.work_id) : undefined;
    return { lesson: w?.name ?? "A standout moment", area: w?.area ?? "pl", level: o.level, note: o.note, photos: o.photos ?? [], ocr: o.ocr_text, highlight: o.highlight };
  };
  const days = [0, 1, 2, 3, 4].map((i) => {
    const day = addDays(monday, i);
    return { day, label: niceDay(day, { weekday: "long", month: "short", day: "numeric" }), items: obs.filter((o) => o.day === day).map(item) };
  });
  const all = days.flatMap((d) => d.items);
  const by = (a: AreaId, lv: Level) => [...new Set(all.filter((x) => x.area === a && x.level === lv).map((x) => x.lesson))];
  const live = skills.filter((s) => !s.archived);
  const canDo = DOMAINS.map((d) => ({
    domain: d.id, domainName: d.short,
    items: live.filter((s) => s.domain === d.id && (skillLevels.get(s.id) === "D" || skillLevels.get(s.id) === "P"))
      .map((s) => ({ name: s.name, ican: s.ican ?? s.name, level: skillLevels.get(s.id)! })),
  })).filter((d) => d.items.length);
  const growing = live.filter((s) => skillLevels.get(s.id) === "E" && s.home_support)
    .slice(0, 3).map((s) => ({ name: s.name, ican: s.ican ?? s.name, level: "E" as SkillLevel, home: s.home_support! }));
  const flagged = all.filter((x) => x.highlight && (x.note || x.photos.length));
  return {
    kid, name: `${goesBy(kid)} ${kid.last_name}`, grade: kid.grade ? GRADE[kid.grade] ?? kid.grade : "", monday, label: weekLabel(monday), sample, note,
    days,
    areas: AREAS.map((a) => ({ id: a.id, name: a.name, introduced: by(a.id, "I"), practiced: by(a.id, "P"), mastered: by(a.id, "M") }))
      .filter((a) => a.introduced.length + a.practiced.length + a.mastered.length > 0),
    stats: {
      lessons: all.length, days: days.filter((d) => d.items.length).length,
      introduced: all.filter((x) => x.level === "I").length, practiced: all.filter((x) => x.level === "P").length, mastered: all.filter((x) => x.level === "M").length,
    },
    canDo, growing,
    highlights: (flagged.length ? flagged : all.filter((x) => x.note)).slice(0, 3),
  };
}

export async function parentReport(supabase: SupabaseClient, studentId: number, monday: string): Promise<ParentReport | null> {
  const friday = addDays(monday, 4);
  const [k, w, sk, ss, o, n] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, grade").eq("id", studentId).in("campus", ["early-years", "demo"]).maybeSingle(),
    supabase.from("ey_works").select("*"),
    supabase.from("ey_skills").select("*").order("sort"),
    supabase.from("ey_skill_status").select("skill_id, level").eq("student_id", studentId),
    supabase.from("ey_observations").select("*").eq("student_id", studentId).gte("day", monday).lte("day", friday).order("created_at"),
    supabase.from("ey_report_notes").select("note").eq("student_id", studentId).eq("period_start", monday).maybeSingle(),
  ]);
  if (!k.data) return null;
  return assemble(
    k.data as Kid, monday, new Map(((w.data ?? []) as Work[]).map((x) => [x.id, x])), (sk.data ?? []) as Skill[],
    (o.data ?? []) as Observation[], new Map((ss.data ?? []).map((r) => [r.skill_id as number, r.level as SkillLevel])),
    n.data?.note ?? null, false,
  );
}

// A made-up week for previewing the layout before anything is recorded.
// Uses the real lessons and skills; never saved anywhere.
export async function sampleReport(supabase: SupabaseClient, studentId: number, monday: string): Promise<ParentReport | null> {
  const [k, w, sk, l] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, grade").eq("id", studentId).maybeSingle(),
    supabase.from("ey_works").select("*"),
    supabase.from("ey_skills").select("*").order("sort"),
    supabase.from("ey_skill_works").select("skill_id, work_id"),
  ]);
  if (!k.data) return null;
  const works = (w.data ?? []) as Work[];
  const skills = (sk.data ?? []) as Skill[];
  return buildSample(k.data as Kid, monday, works, skills);
}

export function buildSample(kid: Kid, monday: string, works: Work[], skills: Skill[]): ParentReport {
  const find = (name: string) => works.find((x) => x.name.toLowerCase().startsWith(name.toLowerCase()));
  const first = goesBy(kid);
  const plan: [number, string, Level, string | null, boolean][] = [
    [0, "Dry pouring", "M", `Poured beans between two pitchers without a spill and wiped the tray unprompted. ${first} asked for the liquid pouring next.`, true],
    [0, "Sandpaper Letters", "P", `Traced s, m and a while saying their sounds; remembered all three the next morning.`, false],
    [1, "Pink Tower", "M", `Built the tower largest to smallest twice in a row and carried each cube with two hands.`, false],
    [1, "I Spy", "P", null, false],
    [2, "Number Rods", "I", `First presentation of rods 1–5. Counted each segment and matched the 3.`, false],
    [2, "Folding cloths", "P", null, false],
    [3, "Setting a table", "P", `Set four places for snack, one cup and one napkin for each friend.`, true],
    [3, "Color Box 2", "I", null, false],
    [4, "Metal Insets", "P", `Traced the circle and filled it with careful parallel lines from left to right.`, false],
    [4, "Puzzle Maps", "I", `Took the World map apart and named Africa and Asia.`, false],
  ];
  const obs: Observation[] = plan.flatMap(([d, name, level, note, highlight], i) => {
    const wk = find(name);
    return wk ? [{
      id: -i - 1, student_id: kid.id, work_id: wk.id, day: addDays(monday, d), level, cycle: "complete", support: level === "I" ? "lesson" : "self",
      note, highlight, by_name: "Guide", by_email: null, created_at: "", photos: [], ocr_text: null,
    } as Observation] : [];
  });
  const lv = new Map<number, SkillLevel>();
  const set = (code: string, l: SkillLevel) => { const s = skills.find((x) => x.code === code); if (s) lv.set(s.id, l); };
  set("ATL-3", "P"); set("ATL-6", "D"); set("PMP-3", "P"); set("PMP-7", "D"); set("SE-2", "D"); set("MA-1", "D");
  set("LL-8", "E"); set("LL-7", "E"); set("SE-5", "E"); set("MA-4", "E");
  const note = `${first} had a calm, focused week. ${first} returned to pouring again and again until every bean stayed in the pitcher, and loved setting the snack table for friends. Next week we'll keep building letter sounds and start counting with the Number Rods.`;
  return assemble(kid, monday, new Map(works.map((x) => [x.id, x])), skills, obs, lv, note, true);
}

export const levelLabel = (l: Level) => LEVEL[l].label;
export const skillLabel = (l: SkillLevel) => SKILL_LEVEL[l].label;

// A family opening a shared link: the database returns only this child's week.
export type SharePayload = {
  monday: string; kid: Kid; note: string | null; levels: Record<string, SkillLevel>;
  obs: Observation[]; works: { id: number; name: string; area: AreaId }[];
  skills: (Pick<Skill, "id" | "code" | "domain" | "name" | "ican" | "home_support" | "archived" | "sort">)[];
};
export function fromShare(p: SharePayload): ParentReport {
  const works = new Map(p.works.map((w) => [w.id, w as unknown as Work]));
  const skills = p.skills as unknown as Skill[];
  // Photos stay private to staff; families see the notes and the writing.
  const obs = p.obs.map((o) => ({ ...o, photos: [] }));
  return assemble(p.kid, p.monday, works, skills, obs, new Map(Object.entries(p.levels).map(([k, v]) => [Number(k), v])), p.note, false);
}

// "Peña Fraga" -> "PenaFraga": the last name part of a family's password.
export const passwordStem = (last: string) => last.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z]/g, "");
