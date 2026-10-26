// Sample data carried over from the Early Years Student Work mockup.
// Replace with real rosters / observations once a data source is chosen.

export type Level = "N" | "E" | "D" | "I";

export const LEVEL: Record<Level, { label: string; bg: string; fg: string; bar: string }> = {
  N: { label: "Up next", bg: "rgba(245,165,36,.14)", fg: "#ffc46b", bar: "#f5a524" },
  E: { label: "Emerging", bg: "#2c2f7a", fg: "#d6d8ff", bar: "#8a8fd6" },
  D: { label: "Developing", bg: "#4f7cf0", fg: "#ffffff", bar: "#4f7cf0" },
  I: { label: "Independent", bg: "#12b5f6", fg: "#04102e", bar: "#12b5f6" },
};

export type Material = { id: string; name: string; s: Level; since: string; purpose: string; mastered?: string; confirm?: string[] };
export type Area = { id: string; name: string; mats: Material[] };

const M = (id: string, name: string, s: Level, since: string, purpose = "", x: Partial<Material> = {}): Material => ({
  id, name, s, since, purpose, ...x,
});

export const AREAS: Area[] = [
  { id: "pl", name: "Practical Life", mats: [
    M("spooning", "Spooning", "I", "Sep 29", "", { mastered: "Oct 1" }), M("tonging", "Tonging", "I", "Oct 3", "", { mastered: "Oct 7" }),
    M("pouring", "Dry Pouring", "D", "Sep 26"), M("wetpour", "Wet Pouring", "N", "", "Pouring water between small pitchers: control, focus and care."),
    M("flower", "Flower Arranging", "D", "Oct 1"), M("food", "Food Preparation", "I", "Oct 2", "", { confirm: ["Oct 2", "Oct 5"] }),
    M("folding", "Folding Cloths", "E", "Oct 6"), M("frames", "Dressing Frames", "E", "Sep 22"),
  ] },
  { id: "se", name: "Sensorial", mats: [
    M("knobbed", "Knobbed Cylinders", "I", "Sep 15", "", { mastered: "Sep 24" }), M("pink", "Pink Tower", "I", "Sep 18", "", { mastered: "Sep 30" }),
    M("brown", "Brown Stair", "D", "Sep 29"), M("color", "Color Tablets", "D", "Oct 2"),
    M("sound", "Sound Cylinders", "N", "", "Matching sounds by ear, which prepares the ear for reading."),
  ] },
  { id: "ma", name: "Math", mats: [
    M("sandnum", "Sandpaper Numerals", "I", "Sep 30"), M("rods", "Number Rods", "D", "Oct 8"), M("spindle", "Spindle Box", "E", "Oct 6"),
    M("golden", "Golden Beads", "N", "", "Units, tens, hundreds and thousands as quantities you can hold."),
  ] },
  { id: "la", name: "Language", mats: [
    M("objpic", "Object to Picture", "I", "Sep 21"), M("sandlet", "Sandpaper Letters", "D", "Oct 9"), M("metal", "Metal Insets", "E", "Oct 5"),
    M("movable", "Movable Alphabet", "N", "", "Building three-letter words from sounds."),
  ] },
  { id: "sc", name: "Science + Culture", mats: [
    M("landwater", "Land and Water Forms", "D", "Sep 30"), M("sink", "Sink and Float", "D", "Sep 25"), M("maps", "Puzzle Maps", "E", "Oct 7"),
    M("plant", "Parts of a Plant", "E", "Oct 8"),
  ] },
];

export const MAT: Record<string, Material> = {};
export const AREA_OF: Record<string, Area> = {};
AREAS.forEach((a) => a.mats.forEach((m) => { MAT[m.id] = m; AREA_OF[m.id] = a; }));

export const FEED: { d: string; m: string; s: Level; note: string }[] = [
  { d: "Fri, Oct 9", m: "flower", s: "D", note: "Remembered to carry the vase with two hands; needed a reminder to return the scissors." },
  { d: "Fri, Oct 9", m: "sandlet", s: "D", note: "Traced and said three new sounds: m, s and t. Now knows 17 sounds." },
  { d: "Thu, Oct 8", m: "rods", s: "D", note: "Built rods 1–6 in order and counted each one; asked for help placing 7–10." },
  { d: "Wed, Oct 7", m: "tonging", s: "I", note: "Third independent tonging work cycle on a separate day: mastered." },
];

export const CLASSES = [
  { id: "am", name: "WonderLab", sub: "Pre-K · Ages 3–5", guide: "Pre-K Guides", week: 41, size: 18 },
  { id: "pm", name: "Learning Lab", sub: "Kindergarten · Ages 5–6", guide: "Kinder Guides", week: 23, size: 18 },
];

// [name, observations this week, last observed, focus area]
export const KIDS: [string, number, string, string][] = (
  [
    [6, "Today", "Practical Life"], [5, "Today", "Practical Life"], [4, "Yesterday", "Language"], [1, "6 days ago", "Sensorial"],
    [3, "Yesterday", "Math"], [0, "8 days ago", "Practical Life"], [4, "Today", "Language"], [2, "3 days ago", "Science + Culture"],
    [5, "Today", "Sensorial"], [3, "2 days ago", "Math"], [0, "7 days ago", "Language"], [4, "Yesterday", "Practical Life"],
    [2, "4 days ago", "Sensorial"], [3, "Yesterday", "Math"],
  ] as [number, string, string][]
).map((k, i) => [`Student ${i + 1}`, ...k]);

export const AVATAR = ["#7fd8ff", "#ffc46b", "#b9bdf5", "#ffb3a6", "#9be7c4"];

// Lead Guide dashboard: 36 students across both classes, deterministic pseudo-random stats.
const rnd = (i: number, k: number) => { const x = Math.sin(i * 97.13 + k * 13.7) * 10000; return x - Math.floor(x); };

export type LeadStudent = {
  name: string; cls: string; clsName: string; days: number; obs: number; indep: number; mastered: number; letters: number; i: number;
};

export const LEAD_STUDENTS: LeadStudent[] = (() => {
  const out: LeadStudent[] = [];
  let n = 0;
  CLASSES.forEach((c) => {
    for (let j = 0; j < c.size; j++, n++) {
      out.push({
        name: `Student ${n + 1}`, cls: c.id, clsName: c.name, days: n === 0 ? 0 : Math.floor(rnd(n, 1) * 10),
        obs: 10 + Math.floor(rnd(n, 2) * 30), indep: n === 0 ? 7 : 1 + Math.floor(rnd(n, 3) * 13),
        mastered: n === 0 ? 4 : Math.floor(rnd(n, 4) * 7), letters: n === 0 ? 11 : Math.floor(rnd(n, 5) * 24), i: n,
      });
    }
  });
  return out;
})();

// [area, % independent, % developing, % emerging]
export const AREA_AGG: [string, number, number, number][] = [
  ["Practical Life", 46, 34, 20], ["Sensorial", 38, 37, 25], ["Math", 22, 41, 37], ["Language", 27, 39, 34], ["Science + Culture", 15, 38, 47],
];
