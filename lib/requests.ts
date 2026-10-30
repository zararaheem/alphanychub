// Request forms (Parent Hub and staff), who each one goes to, and the Slack
// message that tells them. One shared channel; the right person is @-mentioned.

export type Campus = "maiden-ln" | "early-years";
export type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "time" | "tel" | "textarea" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
};
export type RequestKind = {
  id: string;
  title: string;
  blurb: string;
  audience: "parent" | "staff";
  fields: Field[];
  note?: string;
  // Who it goes to: by campus, or one person for both.
  route: (campus: Campus | null, details: Record<string, string>) => Person[];
};
export type Person = { name: string; role: string; slack?: string };

// Slack member IDs come from the Alpha workspace; names still show if one changes.
const P = {
  julianne: { name: "Julianne Braime", role: "Campus Coordinator, Maiden Ln", slack: "U09UUD81XT7" },
  emerly: { name: "Emerly Campusano", role: "Campus Coordinator, Early Years", slack: "U0C304439L3" },
  terrence: { name: "Terrence McMullen", role: "Dean of Parents", slack: "U0BH286DG1L" },
  tasha: { name: "Tasha Arnold", role: "Head of School", slack: "U08GX8M6SAW" },
  zara: { name: "Zara Raheem", role: "Chief of Staff", slack: "U08LJ9V0Z0T" },
} satisfies Record<string, Person>;

const coordinator = (c: Campus | null): Person[] =>
  c === "early-years" ? [P.emerly] : c === "maiden-ln" ? [P.julianne] : [P.julianne, P.emerly];

export const REQUEST_KINDS: RequestKind[] = [
  {
    id: "pickup", audience: "parent", title: "Pickup or dismissal change",
    blurb: "Someone else picking up, early pickup, or a different bus.",
    note: "Bus changes by 11:00 AM. Dismissal is at 3:30 PM.",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "change", label: "What's changing?", type: "select", required: true, options: ["Someone else is picking up", "Early pickup", "Riding a different bus", "Not taking the bus today", "Staying for afterschool", "Not staying for afterschool"] },
      { name: "pickup_person", label: "Who's picking up? (name and relationship)", placeholder: "e.g. Maria Lopez, aunt" },
      { name: "pickup_phone", label: "Their phone", type: "tel" },
      { name: "time", label: "Pickup time (early pickup)", type: "time" },
      { name: "notes", label: "Anything else", type: "textarea" },
    ],
    route: (c) => coordinator(c),
  },
  {
    id: "absence", audience: "parent", title: "Absence or late arrival",
    blurb: "Sick day, appointment, late start or leaving early.",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "until", label: "Back on (if more than one day)", type: "date" },
      { name: "type", label: "Type", type: "select", required: true, options: ["Absent all day", "Arriving late", "Leaving early"] },
      { name: "reason", label: "Reason", type: "select", options: ["Sick", "Medical appointment", "Family", "Travel", "Other"] },
      { name: "time", label: "Expected arrival or leaving time", type: "time" },
      { name: "notes", label: "Anything the Guide should know", type: "textarea" },
    ],
    route: (c) => coordinator(c),
  },
  {
    id: "medication", audience: "parent", title: "Medication at school",
    blurb: "Set up or change a medication your child takes at school.",
    note: "Hand the medication to the Campus Coordinator in its original labeled packaging. We confirm before giving any dose.",
    fields: [
      { name: "medication", label: "Medication name", required: true },
      { name: "dose", label: "Dose", required: true, placeholder: "e.g. 5 ml, 1 tablet" },
      { name: "how", label: "How it's given", type: "select", options: ["By mouth", "Inhaler", "Injection (e.g. EpiPen)", "Cream / topical", "Eye or ear drops", "Other"] },
      { name: "when", label: "When", required: true, placeholder: "e.g. 12:00 PM daily, or as needed for wheezing" },
      { name: "start", label: "Start date", type: "date" },
      { name: "end", label: "End date (if any)", type: "date" },
      { name: "allergies", label: "Allergies or side effects to watch for", type: "textarea" },
      { name: "notes", label: "Anything else", type: "textarea" },
    ],
    route: (c) => coordinator(c),
  },
  {
    id: "question", audience: "parent", title: "Question or meeting request",
    blurb: "Ask a question or ask to meet a Guide, the DoP or the Head of School.",
    fields: [
      { name: "topic", label: "Topic", type: "select", required: true, options: ["Academics & progress", "Wellbeing", "Schedule & logistics", "Something urgent", "Other"] },
      { name: "for", label: "For", type: "select", options: ["Not sure", "My child's Guide", "Dean of Parents", "Head of School"] },
      { name: "want", label: "I'd like", type: "select", options: ["A reply by email", "A phone call", "A meeting"] },
      { name: "message", label: "Your question", type: "textarea", required: true },
    ],
    route: (c, d) => (d.topic === "Something urgent" || d.for === "Head of School" ? [P.tasha, P.terrence] : [P.terrence]),
  },
  {
    id: "content", audience: "staff", title: "Something's missing or wrong in the hub",
    blurb: "A step, a number or a policy that isn't here or is out of date.",
    fields: [
      { name: "where", label: "Where (page or topic)", placeholder: "e.g. Health & safety, Off campus one-pager" },
      { name: "message", label: "What's missing or wrong?", type: "textarea", required: true },
    ],
    route: () => [P.zara],
  },
  {
    id: "staff-help", audience: "staff", title: "Ask leadership",
    blurb: "A question or request for the Campus Coordinator, DoP or Head of School.",
    fields: [
      { name: "for", label: "For", type: "select", options: ["Not sure", "Campus Coordinator", "Dean of Parents", "Head of School", "Chief of Staff"] },
      { name: "message", label: "Your request", type: "textarea", required: true },
      { name: "by", label: "Needed by", type: "date" },
    ],
    route: (c, d) =>
      d.for === "Dean of Parents" ? [P.terrence]
        : d.for === "Head of School" ? [P.tasha]
          : d.for === "Chief of Staff" ? [P.zara]
            : coordinator(c),
  },
];

export const kindById = (id: string) => REQUEST_KINDS.find((k) => k.id === id) ?? null;
export const campusLabel = (c: string | null) => (c === "maiden-ln" ? "Maiden Ln" : c === "early-years" ? "Early Years" : "Both campuses");

// Keeps only the fields the form defines, trimmed and capped.
export function readDetails(kind: RequestKind, form: FormData): { details: Record<string, string>; missing: string[] } {
  const details: Record<string, string> = {};
  const missing: string[] = [];
  for (const f of kind.fields) {
    const v = form.get(f.name);
    const s = typeof v === "string" ? v.trim().slice(0, f.type === "textarea" ? 2000 : 200) : "";
    if (f.options && s && !f.options.includes(s)) continue;
    if (s) details[f.name] = s;
    else if (f.required) missing.push(f.label);
  }
  return { details, missing };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Posts to the shared Slack channel. Never throws: a Slack hiccup must not lose the request.
export async function notifySlack(r: {
  kind: RequestKind; source: "parent" | "staff" | "preview"; campus: Campus | null; student: string | null;
  fromName: string | null; fromEmail: string; details: Record<string, string>; to: Person[]; link: string;
}): Promise<boolean> {
  const who = r.to.map((p) => (p.slack ? `<@${p.slack}>` : p.name)).join(" ");
  const from = r.source === "staff" ? "Staff" : "Parent";
  const lines = r.kind.fields
    .filter((f) => r.details[f.name])
    .map((f) => `*${esc(f.label)}:* ${esc(r.details[f.name])}`);
  // Medication and wellbeing details stay in the hub; Slack gets the headline only.
  const sensitive = r.kind.id === "medication";
  const text = [
    `${r.source === "preview" ? "[TEST] " : ""}*${esc(r.kind.title)}* · ${campusLabel(r.campus)}${r.student ? ` · ${esc(r.student)}` : ""}`,
    `${from}: ${esc(r.fromName ?? r.fromEmail)} · For ${who}`,
    ...(sensitive ? ["_Details are in the hub._"] : lines),
    `<${r.link}|Open in the hub>`,
  ].join("\n");
  return postSlack(text);
}

// Posts plain text to the shared channel. Never throws.
export async function postSlack(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok) console.error("slack: webhook returned", res.status);
    return res.ok;
  } catch (e) {
    console.error("slack: webhook failed", e);
    return false;
  }
}

export const escSlack = esc;

export function hubUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}
