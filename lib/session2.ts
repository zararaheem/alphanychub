// Session 2 student workshops (Oct 19 – Dec 18, 2026), from the
// "Alpha NYC Session 2 Workshops" deck. Edit here to update the hub.
import type { Campus } from "@/lib/campus";

export type Level = "WL" | "LL" | "L1" | "L2" | "MS";

export const SESSION = { name: "Session 2", dates: "Oct 19 – Dec 18, 2026" };

export const LEVELS: { id: Level; name: string; campus: Campus; blocks: string }[] = [
  { id: "WL", name: "WL · PreK + K", campus: "early-years", blocks: "" },
  { id: "LL", name: "LL", campus: "maiden-ln", blocks: "Workshop blocks 12:30–3:00" },
  { id: "L1", name: "L1", campus: "maiden-ln", blocks: "Workshop blocks 1:00–3:00" },
  { id: "L2", name: "L2", campus: "maiden-ln", blocks: "Workshop blocks 1:00–3:00" },
  { id: "MS", name: "Middle School", campus: "maiden-ln", blocks: "Workshop blocks 1:00–3:00" },
];

export type Workshop = {
  id: string; level: Level; title: string; skill: string; summary: string;
  description: string; partners?: string; alphatest?: string; offCampus?: string;
};

export const WORKSHOPS: Workshop[] = [
  // MS
  {
    id: "fit-to-fly", level: "MS", title: "Fit to Fly", skill: "Grit",
    summary: "Train like a fighter pilot: CrossFit against the Air Force fitness test, and F-35 simulator sorties.",
    description: "In Fit to Fly, each middle school student trains the way fighter pilots do, in body and in the cockpit. Twice a week they train at CrossFit Wall Street against the U.S. Air Force Physical Fitness Assessment. On the alternate days they fly F-35 simulators at The Squadron, learning takeoff, mission objectives, and landing, with every instructor intervention logged until there are none.",
    partners: "The Squadron (7 World Trade Center), CrossFit Wall Street, U.S. Air Force PFA standard",
    alphatest: "Complete the U.S. Air Force Physical Fitness Assessment's performance components, improving the combined baseline by at least 15%, and complete 3 independent F-35 simulator sorties, each with a successful takeoff, mission completion and safe landing, with no crash and no instructor intervention.",
    offCampus: "Mon & Wed · CrossFit Wall Street or The Squadron (half each) · walk 1:00–3:00",
  },
  {
    id: "max", level: "MS", title: "MAX", skill: "Public Speaking",
    summary: "Year-long creator workshop. Session 2 is exploring: Ikigai, 5 real-world quests and Pitch Lab.",
    description: "MAX is Alpha's year-long workshop where students stop being consumers and become creators: they build, pitch and ship things of their own. Session 2 is about exploring. Students map their Ikigai, then explore a direction through 5 quests backed by real-world evidence: teardowns of real products, things they actually made, research into what the most successful people in their field are doing. Along the way they train storytelling and public speaking in Pitch Lab, from a 60-second elevator pitch to a full presentation with Q&A.",
    alphatest: "Complete 5 Pitch Lab milestones and 5 MAX quests, culminating in a live Final Pitch (2 min for 6th grade, 3 for 7th, 4 for 8th) followed by an equally long live Q&A answered without guide assistance.",
  },
  {
    id: "rober", level: "MS", title: "Rober Lab", skill: "Public Speaking",
    summary: "Engineer a demo that works, then perform it on camera like Mark Rober. Scored with Yoodli.",
    description: "Every week runs two tracks. Creator Engineering is designing, building, testing and troubleshooting demos. Science Storytelling is turning that demo into an episode and delivering it on camera. Each week: watch a creator pull off something amazing, learn the technique, copy it, remix it with a harder twist, and perform a 60-second explanation on camera. Every recording runs through Yoodli for eye contact, pace and filler words.",
    partners: "Mark Rober initiative (Alpha network pilot)",
    alphatest: "Film an original four-minute, single-take science episode with at least 70% camera eye contact, 120–160 words per minute and no more than three filler words per minute, measured with Yoodli.",
  },
  {
    id: "moma-ms", level: "MS", title: "MoMA", skill: "Public Speaking",
    summary: "Make Pop Art with MoMA's education team and defend it at a live gallery opening.",
    description: "Students work with the Museum of Modern Art's education team to make Pop Art of their own and become exhibiting artists. Each week builds a harder skill: make a stranger care about an ordinary object, explain the choices behind a piece, persuade a skeptic, and defend the work with no script. Pitches are recorded and scored on Orai. At the finale students host a live gallery opening. Middle schoolers also deliver a collector's pitch.",
    partners: "MoMA School and Teacher Programs",
    alphatest: "Deliver a 2-minute artist pitch and a 1-minute surprise Q&A at a live Pop Art gallery opening, earning at least 85% clarity on Orai.",
    offCampus: "Tue (select dates) · MoMA · shuttle, leaves at lunch, 12:00–3:00",
  },
  // L2
  {
    id: "moma-l2", level: "L2", title: "MoMA", skill: "Public Speaking",
    summary: "Make Pop Art with MoMA's education team and defend it at a live gallery opening.",
    description: "Students work with the Museum of Modern Art's education team to make Pop Art of their own and become exhibiting artists. Each week builds a harder skill: make a stranger care about an ordinary object, explain the choices behind a piece, persuade a skeptic, and defend the work with no script. Pitches are recorded and scored on Orai. At the finale students host a live gallery opening.",
    partners: "MoMA School and Teacher Programs",
    alphatest: "Deliver a 2-minute artist pitch and a 1-minute surprise Q&A at a live Pop Art gallery opening, earning at least 85% clarity on Orai.",
    offCampus: "Tue (select dates, half the group) · MoMA · shuttle 12:00–3:00",
  },
  {
    id: "kidzone", level: "L2", title: "KidZone TV: Giving Back the Time", skill: "Socialization",
    summary: "Produce a segment for Mount Sinai's in-house channel for pediatric patients.",
    description: "Each L2 student produces a segment for Mount Sinai's channel for pediatric patients, from a real production lineup: Make It!, Magic in Minutes, Brain Break or Try This!. The skill measured is whether a student can find out what a hospitalized child can actually do (no supplies, lying down, one hand) and teach to that without leaving anyone out.",
    partners: "Mount Sinai, KidZone TV and Child Life",
    alphatest: "Create an instructional video for hospitalized children that is independently accepted by Mount Sinai's KidZone TV team and broadcast on its hospital channel.",
  },
  {
    id: "robots-l2", level: "L2", title: "Ecosystem Engineers", skill: "Public Speaking",
    summary: "Build and code a robot that solves a real problem, then defend the engineering choices.",
    description: "Students start with a prebuilt robot and a problem, then build and program their own, testing it in repeated trials until it works reliably. Alongside the build they practice explaining the problem, how the robot addresses it and why they made each engineering decision, with unscripted questions at every checkpoint.",
    partners: "FIRST Robotics League",
    alphatest: "Deliver a 4-minute engineering pitch. Pass both bars: the robot works in 3 consecutive live trials (FIRST League Challenge anchor), and at least 90/100 speech clarity on Orai plus 3 live, unscripted questions answered.",
  },
  {
    id: "tennis-l2", level: "L2", title: "Tennis and Movement", skill: "Grit",
    summary: "Train at Hudson River Tennis Club: jump rope and self-rally streaks where every miss resets.",
    description: "Students train at Hudson River Tennis Club with professional coaches and a strength and conditioning coach and learn what it takes to keep going after a miss. Two skills: jump rope and the tennis self-rally, where every miss sends the count back to zero. Every attempt and streak is logged from week one.",
    partners: "Hudson River Tennis Club",
    alphatest: "Complete 250 consecutive jump-rope skips and 250 consecutive tennis self-rally hits, restarting after every miss.",
    offCampus: "Thu (all) · Tennis at HRTC · shuttle 12:30–3:00",
  },
  // L1
  {
    id: "robots-l1", level: "L1", title: "Ecosystem Engineers Part 2", skill: "Public Speaking",
    summary: "Build and code a robot that solves a real problem, then defend it to a FIRST reviewer.",
    description: "Students start with a prebuilt robot and a problem, then build and program their own, testing it in repeated trials until it works reliably. Alongside the build they practice explaining the problem, how the robot addresses it and why they made each engineering decision, with unscripted questions at every checkpoint.",
    partners: "FIRST Robotics League",
    alphatest: "Build, code and demonstrate a robot that solves a real-world problem, then explain and defend the engineering choices before a FIRST League reviewer, meeting the grade band's reliability and speaking thresholds.",
  },
  {
    id: "tennis-l1", level: "L1", title: "Tennis and Movement", skill: "Grit",
    summary: "Train at Hudson River Tennis Club: jump rope and self-rally streaks where every miss resets.",
    description: "Students train at Hudson River Tennis Club with professional coaches and a strength and conditioning coach and learn what it takes to keep going after a miss. Two skills: jump rope and the tennis self-rally, where every miss sends the count back to zero. Every attempt and streak is logged from week one.",
    partners: "Hudson River Tennis Club",
    alphatest: "Complete 100 consecutive jump-rope skips and 100 consecutive tennis self-rally hits, restarting after every miss, each within 100 attempts.",
    offCampus: "Mon (William's group) & Tue (Verena's group) · Tennis at HRTC · shuttle 12:30–3:00",
  },
  {
    id: "wild-issue", level: "L1", title: "The Wild Issue: Giving Back the Time", skill: "Socialization",
    summary: "Wildlife journalists make a magazine for kids on Mount Sinai's pediatric cancer wing.",
    description: "Two newsrooms, the Zoo Edition and the Aquarium Edition. Students photograph animals, gather facts and interview a zookeeper or aquarist, then turn their reporting into stories, photo features and games playable from a hospital bed. Each student identifies three experiences children on the ward are missing, recruits five peers and leads the team to bring them to the page.",
    partners: "Mount Sinai Child Life; zoo and aquarium visits with professional interviews",
    alphatest: "The magazine brings all 3 experiences to life through at least 1 original game, 1 real interview and 3 student-taken photographs, and is accepted by Mount Sinai's Child Life team for distribution.",
  },
  // LL
  {
    id: "piano", level: "LL", title: "Practice Lab (Piano)", skill: "Independence",
    summary: "Independent piano practice blocks.",
    description: "Practice Lab (Piano) builds independence through structured piano practice.",
  },
  {
    id: "rock-climbing", level: "LL", title: "Rock Climbing", skill: "Grit",
    summary: "Weekly climbing with coaches: top out the Project route you couldn't finish in Week 1.",
    description: "Students climb with professional coaches once a week. In Week 1 every student climbs the graded routes upward until they reach the first one they can't top out: that becomes their Project. Every climb goes on a route card (attempts and high point), so a fall becomes a number to beat next time.",
    partners: "Climbing gym and coaches (to confirm)",
    alphatest: "Send Day (Week 7): top out the Project in up to three attempts. Resting on the rope is allowed, being pulled up is not. The route card must show attempts and a high point for every climbing week.",
    offCampus: "Wed (Group A) & Thu (Group B) · climbing gym · 1:00–3:00, depart time TBD",
  },
  {
    id: "maiden-lane", level: "LL", title: "The Maiden Lane Project", skill: "Storytelling and Public Speaking",
    summary: "Verbatim theater: interview Maiden Lane neighbors and perform their real words.",
    description: "Working in pairs, students interview real neighbors (building and school staff, shop and café owners around Maiden Lane, family members), who all answer one shared question such as \"What makes a neighborhood feel like home?\" Guides transcribe the recordings; students pick the golden lines and defend each pick. Every student performs 2 to 4 sentences of a neighbor's words with a voice, a gesture and a prop.",
    partners: "Eight Maiden Lane neighbors (to confirm), invited as guests of honor",
    alphatest: "The Show and Talkback at Dinner Theater Night (week of Dec 14): deliver the neighbor's words word for word and audibly, and answer \"Why did you choose those words?\" with a reason about the neighbor.",
    offCampus: "Neighbor interviews leave campus on select weeks",
  },
  {
    id: "polite-society-nyc", level: "LL", title: "Polite Society NYC", skill: "Uphold Community Standards",
    summary: "Host a dinner party in another culture's language and customs at Dinner Theater Night.",
    description: "Students taste foods from five or six of New York's cultures, then form four teams around one culture. A family member or community ambassador teaches each team a greeting and goodbye, how the food is eaten, a custom of respect at the table and one non-food cultural element. Teams visit a restaurant from their culture, then host families at Dinner Theater Night. Every student has a table role but is checked individually. The hosting is graded, not the food.",
    partners: "Family and community cultural ambassadors; four local restaurants (to confirm)",
    offCampus: "Restaurant visits on select weeks",
  },
  // WL
  {
    id: "alpha-news", level: "WL", title: "Alpha News Network", skill: "Public Speaking",
    summary: "Young anchors, field reporters and interviewers produce a student-led news broadcast.",
    description: "Students become news anchors, field reporters and interviewers. They investigate what's happening around Alpha, ask thoughtful questions and turn their discoveries into news reports, building confidence speaking in front of others. The workshop culminates in the premiere of Alpha News Network, a student-led broadcast for families and the Alpha community.",
  },
  {
    id: "climb-quest", level: "WL", title: "Climb Quest", skill: "Grit",
    summary: "When climbing gets scary: say a brave word and climb on within 30 seconds.",
    description: "Each PreK and Kinder student climbs higher each week with gym staff. Every hard moment (a freeze, a fear, a fall) is practice for the same chain: brave word, then climb on within 30 seconds. Summit Climb day is a 10-minute filmed climb with parents watching.",
    alphatest: "Live climb with parents watching to the band's height, overcoming at least one challenging moment, recovering within 30 seconds each time, with 0 adult verbal cues.",
  },
  {
    id: "polite-society-wl", level: "WL", title: "Polite Society", skill: "Socialization",
    summary: "Host a tea party: welcome guests, table manners, serving and polite conversation.",
    description: "Students become hosts of their own tea party, learning to welcome guests, practice table manners, serve refreshments and make polite conversation through role-play and real guests. It culminates in a formal tea party where each child independently hosts a family member or guest, from the first hello to the final goodbye, without adult assistance.",
  },
];

// Weekly workshop-block schedules (rows: day, then blocks).
export const WEEKLY: Partial<Record<Level, { day: string; blocks: string[] }[]>> = {
  LL: [
    { day: "Mon", blocks: ["A · Maiden Lane 1:45–2:30", "B · Practice Lab 1:30–2:30"] },
    { day: "Tue", blocks: ["A · Practice Lab 1:30–2:30", "B · Maiden Lane 1:45–2:30"] },
    { day: "Wed", blocks: ["A · Rock Climbing 1:00–3:00 (off campus)", "B · Maiden Lane 1:45–2:30"] },
    { day: "Thu", blocks: ["A · Maiden Lane 1:45–2:30", "B · Rock Climbing 1:00–3:00 (off campus)"] },
    { day: "Fri", blocks: ["All · Polite Society NYC 1:45–2:30"] },
  ],
  L1: [
    { day: "Mon", blocks: ["Ocean · Tennis at HRTC 12:30–3:00 (off campus)", "Zoo · Fitness 1:00–2:00 · Check Chart 2:00–3:00"] },
    { day: "Tue", blocks: ["Ocean · Fitness 1:00–2:00 · Check Chart 2:00–3:00", "Zoo · Tennis at HRTC 12:30–3:00 (off campus)"] },
    { day: "Wed", blocks: ["Ocean · Robots 1:00–2:30", "Zoo · Magazine 1:00–2:30", "Culture Club 2:30–3:00"] },
    { day: "Thu", blocks: ["Ocean · Magazine 1:00–2:30", "Zoo · Robots 1:00–2:30", "Town Hall 2:30–3:00"] },
    { day: "Fri", blocks: ["Check Chart 1:00–2:00", "Fun Friday 2:00–3:00"] },
  ],
  L2: [
    { day: "Mon", blocks: ["KidZone TV 1:00–2:00", "Fit on campus 2:00–2:30", "Check Chart 2:30–3:00"] },
    { day: "Tue", blocks: ["Half · MoMA 12:00–3:00 (off campus)", "Half · Robots 1:00–3:00"] },
    { day: "Wed", blocks: ["KidZone TV 1:00–2:00", "Fit on campus 2:00–2:30", "Town Hall 2:30–3:00"] },
    { day: "Thu", blocks: ["All · Tennis at HRTC 12:30–3:00 (off campus)"] },
    { day: "Fri", blocks: ["Check Chart 1:00–2:00", "Fun Friday 2:00–3:00"] },
  ],
  MS: [
    { day: "Mon", blocks: ["Viper · CrossFit 1:00–2:30 (off campus) · MAX 2:30–3:00", "Nighthawk · The Squadron 1:00–3:00 (off campus)"] },
    { day: "Tue", blocks: ["MoMA 12:00–3:00 (off campus, leaves at lunch)", "Rober Lab 1:00–3:00"] },
    { day: "Wed", blocks: ["Viper · The Squadron 1:00–3:00 (off campus)", "Nighthawk · CrossFit 1:00–2:30 (off campus) · MAX 2:30–3:00"] },
    { day: "Thu", blocks: ["Town Hall 1:00–1:30", "Rober Lab 1:30–3:00", "Wilderness First Aid 1:30–3:00"] },
    { day: "Fri", blocks: ["MAX 1:00–2:00", "Fit Friday 2:00–3:00"] },
  ],
};

export const SHOWCASES: { date: string; levels: string; time: string; place?: string }[] = [
  { date: "Wed, Dec 9", levels: "MS", time: "1:00–3:00 PM (proposed)", place: "The Squadron" },
  { date: "Thu, Dec 10", levels: "L2", time: "9:30–11:00 AM (proposed)" },
  { date: "Thu, Dec 10", levels: "L1", time: "2:00–3:30 PM (proposed)" },
  { date: "Fri, Dec 11", levels: "WL · PreK + K", time: "1:00–3:00 PM (proposed)" },
  { date: "Week of Dec 14", levels: "LL", time: "Dinner Theater Night" },
];

export const MOMA_DATES = "Oct 27 · Nov 3 · Nov 6 · Nov 17 · Nov 20 · Dec 1 · Dec 8 · Dec 15";

export const LOCATIONS = [
  "HRTC (Hudson River Tennis Club), 300 Vesey St",
  "CrossFit Wall Street, 60 New St",
  "The Squadron, 7 WTC, 10th Floor",
  "MoMA, 11 W 53rd St",
];
