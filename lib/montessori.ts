// Early Years Montessori work: areas, lessons, skills, levels and dates.
// Lessons come from the Montessori-Inspired PreK Crosswalk; skills are the
// Wonder Lab Success Indicators. Both are editable in the tracker.

export type Level = "I" | "P" | "M"; // a lesson: Introduced / Practiced / Mastered
export type SkillLevel = "U" | "E" | "D" | "P"; // a skill: not yet / Introduced / Practiced / Mastered (same words as lessons)
export type AreaId = "pl" | "se" | "ma" | "la" | "sc";
export type DomainId = "ATL" | "SE" | "LL" | "COG" | "PMP";
export type Cycle = "brief" | "complete";
export type Support = "self" | "invited" | "lesson";

export const AREAS: { id: AreaId; name: string }[] = [
  { id: "pl", name: "Practical Life" },
  { id: "se", name: "Sensorial" },
  { id: "la", name: "Language" },
  { id: "ma", name: "Mathematics" },
  { id: "sc", name: "Culture" },
];
export const AREA_NAME = Object.fromEntries(AREAS.map((a) => [a.id, a.name])) as Record<AreaId, string>;

export const DOMAINS: { id: DomainId; name: string; short: string }[] = [
  { id: "ATL", name: "Approaches to Learning", short: "Learning habits" },
  { id: "SE", name: "Social and Emotional Development", short: "Social & emotional" },
  { id: "LL", name: "Language and Literacy", short: "Language & literacy" },
  { id: "COG", name: "Cognition: Mathematics and Scientific Reasoning", short: "Math & science" },
  { id: "PMP", name: "Perceptual, Motor, and Physical Development", short: "Movement & body" },
];
export const DOMAIN_NAME = Object.fromEntries(DOMAINS.map((d) => [d.id, d.name])) as Record<DomainId, string>;

export const LEVELS: Level[] = ["I", "P", "M"];
export const LEVEL: Record<Level, { label: string; help: string; bg: string; fg: string }> = {
  I: { label: "Introduced", help: "Lesson presented to the child.", bg: "#2c2f7a", fg: "#d6d8ff" },
  P: { label: "Practiced", help: "Child chooses and repeats the work independently.", bg: "#4f7cf0", fg: "#ffffff" },
  M: { label: "Mastered", help: "Completes the work correctly and independently at least twice, presents it back without error, or shows a peer.", bg: "#12b5f6", fg: "#04102e" },
};
// Skills use the same three words as lessons. "U" means not yet observed (shown as blank).
export const SKILL_LEVELS: SkillLevel[] = ["U", "E", "D", "P"];
export const SKILL_PICK: SkillLevel[] = ["E", "D", "P"];
export const SKILL_LEVEL: Record<SkillLevel, { label: string; help: string; step: number }> = {
  U: { label: "Not yet", help: "Not yet presented or not yet observed.", step: 0 },
  E: { label: "Introduced", help: "Shows the skill sometimes, with an adult prompting or modeling.", step: 1 },
  D: { label: "Practiced", help: "Shows the skill often, with the odd reminder.", step: 2 },
  P: { label: "Mastered", help: "Shows the skill on their own, every day and in different settings.", step: 3 },
};
export const CYCLE: Record<Cycle, string> = { brief: "Brief", complete: "Full work cycle" };
export const SUPPORT: Record<Support, string> = { self: "Chose it", invited: "Invited", lesson: "Lesson given" };

export type Work = {
  id: number; area: AreaId; name: string; description: string | null; sort: number; archived: boolean;
  strand: string | null; direct_aim: string | null; indirect_aims: string | null; elof: string | null;
  common_core: string | null; evidence: string | null; ai_skills: string | null; checks: string | null;
};
export type Skill = {
  id: number; code: string; domain: DomainId; sub: string | null; name: string; indicator: string | null;
  floor: string | null; benchmark: string | null; stretch: string | null; ican: string | null;
  home_support: string | null; elof: string | null; checks: string[]; tension: string | null; sort: number; archived: boolean;
};
export type Observation = {
  id: number; student_id: number; work_id: number | null; day: string; level: Level | null;
  cycle: Cycle | null; support: Support | null; note: string | null; highlight: boolean;
  by_name: string | null; by_email: string | null; created_at: string;
  photos: string[]; ocr_text: string | null;
};

// Weeks run Monday to Friday; dates are New York dates (YYYY-MM-DD).
export function nyToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function mondayOf(day: string): string {
  const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -((wd + 6) % 7));
}
export function niceDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}
export const weekLabel = (monday: string) => `${niceDay(monday, { month: "short", day: "numeric" })} – ${niceDay(addDays(monday, 4), { month: "short", day: "numeric", year: "numeric" })}`;

// The name a child goes by: "Alexander (Sasha)" → "Sasha".
export const goesBy = (k: { first_name: string; last_name: string }) => {
  const nick = /\(([^)]+)\)/.exec(k.first_name)?.[1];
  return nick ?? k.first_name.replace(/\s*\(.*\)/, "");
};
