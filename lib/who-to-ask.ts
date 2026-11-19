// "Who do I ask?" at a glance, grouped by person, from the activity checklist
// and the emergency team roles.
export type AskPerson = { who: string; role: string; topics: string[] };

const PEOPLE: AskPerson[] = [
  {
    who: "Zara", role: "Chief of Staff",
    topics: [
      "Security requests: building access, visitors, Raptor, cameras, safety concerns",
      "Changing an off-campus venue or park (locations are vetted for security), and trip routes",
      "Medication (with the Campus Coordinators)",
      "Bus routes, stops and ride requests (no one-off rides)",
      "Trip security clearance (or run it on the board)",
      "Waivers",
      "Vendor / off-site activities requiring a contract (with Legal)",
      "Vendors coming on campus (with Julianne)",
      "Guests coming in (with Julianne)",
    ],
  },
  {
    who: "Julianne", role: "Campus Coordinator, Maiden Ln",
    topics: [
      "Logistics: dismissal, pickups, authorized pickup changes, late arrivals and early release",
      "Lunch program",
      "Medication: receiving, storing (mini staff fridge in the admin space) and records",
      "Off-campus attendance",
      "Transportation",
      "Photos, video, media release",
      "Lunch changes (Maiden Ln)",
      "Guests and vendors coming on campus",
      "Missing or hurt student (Maiden Ln)",
    ],
  },
  { who: "Emerly", role: "Campus Coordinator, Early Years", topics: ["Lunch changes (Early Years)", "Missing or hurt student (Early Years)", "Medication (Early Years)"] },
  { who: "Lead Guards", role: "Derek Ghee (Maiden Ln) · Sugey Castillo (Early Years)", topics: ["Missing student search", "Door and building security on the day"] },
  { who: "Emily", role: "Director of Global Programming", topics: ["Student experiences", "Off-campus app (trip on the board)"] },
  { who: "Terrence", role: "DoP (Dean of Parents)", topics: ["All parent-facing communications", "Behavioral issues (with Nancy)"] },
  { who: "Nancy", role: "Dean of Students", topics: ["Behavioral issues: infractions, strikes, behavior plans, discipline reviews (with Terrence)"] },
  { who: "Tasha", role: "Head of Schools", topics: ["Finance: budget approvals, spending and reimbursements, workshop costs and new venues (even inside the building), documented and approved", "Booking videographers and storytellers", "Media or press questions", "Anything else"] },
  { who: "Jim", role: "Jim Liu, backup transport", topics: ["Backup car when a bus or trip vehicle doesn't show or is too small"] },
  { who: "Ops", role: "Operations", topics: ["Room or setup changes"] },
];

// Cards A–Z by name; each card's topics A–Z ("Anything else" stays last).
const az = (a: string, b: string) => (a === "Anything else" ? 1 : b === "Anything else" ? -1 : a.localeCompare(b));
export const WHO_BY_PERSON: AskPerson[] = PEOPLE
  .map((p) => ({ ...p, topics: [...p.topics].sort(az) }))
  .sort((a, b) => a.who.localeCompare(b.who));

export const EMERGENCY_NOW = "Emergency happening now: call 911, then alert everyone on your radio (alt: Zello).";

// Flat topic → person list, for search and the assistant.
export const WHO_TO_ASK: { topic: string; who: string }[] = [
  ...WHO_BY_PERSON.flatMap((p) => p.topics.map((topic) => ({ topic, who: p.who }))),
  { topic: "Emergency happening now", who: "Call 911, then radio (alt: Zello)" },
];
