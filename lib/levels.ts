// Program levels in roster order, youngest first, with the campus each meets at.
export const PROGRAM_LEVELS = [
  { name: "Wonder Lab", grades: "PreK", campus: "early-years" },
  { name: "Learning Lab", grades: "K–1", campus: "maiden-ln" },
  { name: "Level 1", grades: "1–4", campus: "maiden-ln" },
  { name: "Level 2", grades: "3–6", campus: "maiden-ln" },
  { name: "Middle School", grades: "6–8", campus: "maiden-ln" },
  { name: "High School", grades: "9+", campus: "maiden-ln" },
] as const;

export const levelRank = (level: string | null) => {
  const i = PROGRAM_LEVELS.findIndex((l) => l.name === level);
  return i < 0 ? 99 : i;
};

export const gradeRank = (g: string | null) => (g === "PK" ? -1 : g === "K" ? 0 : Number(g ?? 99));
