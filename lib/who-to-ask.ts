// "Who do I ask?" at a glance, grouped by person, from the activity checklist
// and the emergency team roles. Each person has a one-line summary and their
// topics in short labelled groups, so long lists stay easy to scan.
export type AskGroup = { label?: string; items: string[] };
export type AskPerson = { who: string; role: string; summary: string; groups: AskGroup[]; topics: string[] };

const PEOPLE: Omit<AskPerson, "topics">[] = [
  {
    who: "Zara", role: "Chief of Staff",
    summary: "Security, venue changes, buses, contracts and waivers.",
    groups: [
      { label: "Security", items: ["Building access, visitors, Raptor, cameras", "Any safety concern", "Guests and vendors coming on campus (with Julianne)"] },
      { label: "Trips & buses", items: ["Changing a venue or park (all are security-vetted)", "Trip routes and security clearance", "Bus routes, stops and ride requests (no one-off rides)"] },
      { label: "Paperwork", items: ["Vendor or off-site contracts (with Legal)", "Waivers"] },
      { label: "Health", items: ["Medication (with the Campus Coordinators)"] },
    ],
  },
  {
    who: "Julianne", role: "Campus Coordinator, Maiden Ln",
    summary: "The school day at Maiden Ln: arrivals, pickups, lunch, medication.",
    groups: [
      { label: "Arrival & dismissal", items: ["Pickups and authorized pickup changes", "Late arrivals and early release", "Transportation and off-campus attendance"] },
      { label: "Lunch", items: ["Lunch program and lunch changes"] },
      { label: "Health", items: ["Medication: receiving, storing (admin-space fridge), records", "Missing or hurt student"] },
      { label: "On campus", items: ["Guests and vendors coming in", "Photos, video and media releases"] },
    ],
  },
  {
    who: "Emerly", role: "Campus Coordinator, Early Years",
    summary: "The school day at Early Years.",
    groups: [{ items: ["Lunch changes", "Medication", "Missing or hurt student"] }],
  },
  {
    who: "Lead Guards", role: "Derek Ghee (Maiden Ln) · Sugey Castillo (Early Years)",
    summary: "Doors and searches on the day.",
    groups: [{ items: ["Missing student search", "Door and building security"] }],
  },
  {
    who: "Emily", role: "Director of Global Programming",
    summary: "Programs, guide training and the off-campus tracker.",
    groups: [{ items: ["Experiences", "International expansion", "Guide training", "Off-campus app and tracker (trip on the board, venue point person)"] }],
  },
  {
    who: "Terrence", role: "Dean of Parents",
    summary: "Anything that goes to a family.",
    groups: [{ items: ["All parent-facing messages", "Behavior issues (with Nancy)"] }],
  },
  {
    who: "Nancy", role: "Dean of Students",
    summary: "Behavior and discipline.",
    groups: [{ items: ["Infractions, strikes and behavior plans", "Discipline reviews (with Terrence)"] }],
  },
  {
    who: "Tasha", role: "Head of Schools",
    summary: "Money and approvals, and anything not listed here.",
    groups: [
      { label: "Money", items: ["Budget approvals, spending and reimbursements", "Workshop costs", "New venues, even inside the building"] },
      { label: "Media", items: ["Booking videographers and storytellers", "Press questions"] },
      { label: "Else", items: ["Anything not on this list"] },
    ],
  },
  {
    who: "Jim", role: "Jim Liu, backup transport",
    summary: "Backup cars.",
    groups: [{ items: ["A bus or trip vehicle doesn't show or is too small"] }],
  },
  {
    who: "Ops", role: "Operations",
    summary: "Rooms and setup.",
    groups: [{ items: ["Room or setup changes"] }],
  },
];

// Cards A–Z by name. `topics` is the flat list (group label + item) the
// assistant and search use.
export const WHO_BY_PERSON: AskPerson[] = PEOPLE
  .map((p) => ({ ...p, topics: p.groups.flatMap((g) => g.items.map((i) => (g.label ? `${g.label}: ${i}` : i))) }))
  .sort((a, b) => a.who.localeCompare(b.who));

export const EMERGENCY_NOW = "Emergency happening now: call 911, then alert everyone on your radio (alt: Zello).";

// Flat topic → person list, for search and the assistant.
export const WHO_TO_ASK: { topic: string; who: string }[] = [
  ...WHO_BY_PERSON.flatMap((p) => p.topics.map((topic) => ({ topic, who: p.who }))),
  { topic: "Emergency happening now", who: "Call 911, then radio (alt: Zello)" },
];
