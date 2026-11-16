import { WHO_BY_PERSON } from "@/lib/who-to-ask";

// Sorts each question into a topic for the Insights page. Keyword rules, so it
// costs nothing to run; the first topic whose words match wins.
export const TOPICS: { id: string; label: string; words: RegExp }[] = [
  { id: "emergency", label: "Emergencies & drills", words: /\b(emergenc|lockdown|evacuat|fire|shelter|drill|911|missing|lost child|intruder|threat)/i },
  { id: "behavior", label: "Behavior & discipline", words: /\b(punch|hit|hitting|kick|bite|fight|push|bull(y|ied|ying)|behav|strike|card|disciplin|swear|curs|rude|disrespect|threw|throw|hurt (another|a friend)|consequence|suspen)/i },
  { id: "health", label: "Health, injury & medication", words: /\b(medic|tylenol|advil|inhaler|epipen|allerg|sick|fever|vomit|injur|bleed|nurse|first aid|bump|head|ill)\w*/i },
  { id: "pickup", label: "Pickup, dismissal & arrival", words: /\b(pick ?up|pickup|dismiss|drop ?off|late|tardy|early (release|pickup)|authorized|walker|bus|arriv|check[- ]?(in|out))/i },
  { id: "safety", label: "Security & visitors", words: /\b(visitor|raptor|guest|security|door|badge|stranger|camera|lobby|guard|building access)/i },
  { id: "offcampus", label: "Trips, parks & off campus", words: /\b(trip|field|park|playground|off[- ]campus|outside|walk to|museum|outing)/i },
  { id: "lunch", label: "Lunch & food", words: /\b(lunch|snack|food|meal|eat|nut)/i },
  { id: "money", label: "Budget & spending", words: /\b(budget|buy|purchase|spend|reimburs|expens|money|pay|invoice|vendor|contract|order)/i },
  { id: "tech", label: "Devices & technology", words: /\b(laptop|ipad|device|charger|computer|chromebook|wifi|password|login|timeback|app\b)/i },
  { id: "attendance", label: "Attendance & absences", words: /\b(absen|attendance|sick day|vacation|out of school|missed school)/i },
  { id: "families", label: "Families & communication", words: /\b(parent|family|families|mom|dad|guardian|email|message|parentsquare|call home)/i },
  { id: "policy", label: "School policies", words: /\b(phone|cell|dress code|uniform|homework|media|photo|pronoun|privacy|record|accommodat|iep|504|support)/i },
];
export const OTHER = { id: "other", label: "Other" };
export const topicLabel = (id: string | null) => TOPICS.find((t) => t.id === id)?.label ?? OTHER.label;

export function topicOf(question: string): string {
  return TOPICS.find((t) => t.words.test(question))?.id ?? OTHER.id;
}

// The people named in an answer's "Check with" part, so we can see who gets asked about most.
export function checkWith(answer: string | null): string[] {
  if (!answer) return [];
  const start = answer.search(/\*\*Check with/i);
  const rest = start >= 0 ? answer.slice(start) : answer;
  const end = rest.search(/\*\*From the policy/i);
  const part = end > 0 ? rest.slice(0, end) : rest;
  return WHO_BY_PERSON.map((p) => p.who).filter((who) => who !== "Ops" && new RegExp(`\\b${who.split(" ")[0]}\\b`).test(part));
}

// "Where do we go if Imagination Playground is closed??" -> "where do we go if imagination playground is closed"
export const normalize = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
