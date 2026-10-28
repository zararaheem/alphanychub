// Health & safety rules every staff member follows. Shown on the Health &
// safety page and fed to Ask the hub and search.
export const HEALTH_RULES: { rule: string; detail: string }[] = [
  { rule: "Don't remove splinters", detail: "Or anything stuck in the skin or eye. Clean and cover it, and tell your Campus Coordinator so the family can be told." },
  { rule: "Only give medication that's in a record here", detail: "Follow the record exactly. No over-the-counter medicine (pain relievers, allergy pills, creams) without written parent permission." },
  { rule: "Gloves for any blood or body fluid", detail: "Every time, then wash your hands. Bag anything with blood on it." },
  { rule: "Report every injury", detail: "Tell your Campus Coordinator the same day. Bumps to the head, face or neck: tell them right away, even if the student seems fine." },
  { rule: "Check allergies before any food", detail: "Including treats, snacks and cooking activities. Ask if you're not sure." },
  { rule: "Never share student information", detail: "Names, photos, health details, addresses and parent contacts stay inside Alpha. No personal texts, social media, or personal email; don't screenshot the hub." },
  { rule: "Parents are notified through the school", detail: "Your Campus Coordinator and the DoP (Terrence) contact the family. Don't message parents from your own phone." },
];

// If a student gets injured, in order.
export const INJURY_STEPS: string[] = [
  "Give immediate care first. Gloves for any blood.",
  "Call 911 if it's serious: heavy bleeding, trouble breathing, unresponsive, a possible broken bone, or a head injury with confusion or vomiting.",
  "If it's a wound, take a photo to document it for the parents. Share it only with your Campus Coordinator and the DoP.",
  "Notify parents: tell your Campus Coordinator right away; they and the DoP (Terrence) contact the family.",
  "Not sure what to do? Check in with Tasha or Terrence.",
];
