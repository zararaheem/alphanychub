export const HUB_NAME = "Alpha NYC Hub";

export type Campus = "maiden-ln" | "early-years";
export type CampusScope = Campus | "all";

export const CAMPUSES: { id: Campus; name: string; blurb: string }[] = [
  { id: "maiden-ln", name: "Maiden Ln", blurb: "Grades 1–12 · 180 Maiden Lane" },
  { id: "early-years", name: "Early Years", blurb: "William St · WL (PreK + K)" },
];

export const CAMPUS_LABEL: Record<CampusScope, string> = {
  "maiden-ln": "Maiden Ln",
  "early-years": "Early Years",
  all: "Both campuses",
};

export function parseCampus(v: string | string[] | undefined): Campus | null {
  return v === "maiden-ln" || v === "early-years" ? v : null;
}

// "2026-10-26" → "Mon 10/26" without timezone drift.
export function shortDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${wd} ${m}/${d}`;
}

// "07:45:00" → "7:45 AM"
export function clock(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Today in New York as YYYY-MM-DD.
export function todayNY() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
