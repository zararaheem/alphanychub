// "Who do I ask?" at a glance, grouped by person, from the activity checklist
// and the emergency team roles.
export type AskPerson = { who: string; role: string; topics: string[] };

export const WHO_BY_PERSON: AskPerson[] = [
  {
    who: "Zara", role: "Chief of Staff",
    topics: [
      "Security, guards, door access",
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
      "Off-campus attendance",
      "Transportation",
      "Photos, video, media release",
      "Lunch changes (Maiden Ln)",
      "Guests and vendors coming on campus",
      "Missing or hurt student: call (Maiden Ln)",
    ],
  },
  { who: "Emerly", role: "Campus Coordinator, Early Years", topics: ["Lunch changes (Early Years)", "Missing or hurt student: call (Early Years)"] },
  { who: "Lead Guards", role: "Derek Ghee (Maiden Ln) · Sugey Castillo (Early Years)", topics: ["Missing student search", "Door and building security on the day"] },
  { who: "Emily", role: "Director of Global Programming", topics: ["Off-campus app (trip on the board)"] },
  { who: "Terrence", role: "DoP (Dean of Parents)", topics: ["All parent and family messages"] },
  { who: "Tasha", role: "Head of Schools", topics: ["Media or press questions"] },
  { who: "Ops", role: "Operations", topics: ["Room or setup changes"] },
];

export const EMERGENCY_NOW = "Emergency happening now: call 911, then alert everyone on your radio (alt: Zello).";

// Flat topic → person list, for search and the assistant.
export const WHO_TO_ASK: { topic: string; who: string }[] = [
  ...WHO_BY_PERSON.flatMap((p) => p.topics.map((topic) => ({ topic, who: p.who }))),
  { topic: "Emergency happening now", who: "Call 911, then radio (alt: Zello)" },
];
