// Early Years Montessori work: areas, levels and the week a report covers.

export type Level = "N" | "E" | "D" | "I";
export type AreaId = "pl" | "se" | "ma" | "la" | "sc";
export type Cycle = "brief" | "complete";
export type Support = "self" | "invited" | "lesson";

export const AREAS: { id: AreaId; name: string }[] = [
  { id: "pl", name: "Practical Life" },
  { id: "se", name: "Sensorial" },
  { id: "ma", name: "Math" },
  { id: "la", name: "Language" },
  { id: "sc", name: "Science + Culture" },
];
export const AREA_NAME = Object.fromEntries(AREAS.map((a) => [a.id, a.name])) as Record<AreaId, string>;

export const LEVELS: Level[] = ["N", "E", "D", "I"];
export const LEVEL: Record<Level, { label: string; bg: string; fg: string }> = {
  N: { label: "Up next", bg: "rgba(245,165,36,.16)", fg: "#c98410" },
  E: { label: "Emerging", bg: "#2c2f7a", fg: "#d6d8ff" },
  D: { label: "Developing", bg: "#4f7cf0", fg: "#ffffff" },
  I: { label: "Independent", bg: "#12b5f6", fg: "#04102e" },
};
export const CYCLE: Record<Cycle, string> = { brief: "Brief", complete: "Full work cycle" };
export const SUPPORT: Record<Support, string> = { self: "Chose it", invited: "Invited", lesson: "Lesson given" };

export type Work = { id: number; area: AreaId; name: string; description: string | null; sort: number; archived: boolean };
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
