import { createClient } from "@/lib/supabase/server";
import { GUIDES } from "@/lib/guides";
import { LEVELS, WORKSHOPS } from "@/lib/session2";
import { ATTENDANCE_URL, OFF_CAMPUS_URL, TRANSPORT_URL } from "@/lib/links";
import type { Contact, Procedure, StaffMember } from "@/lib/types";
import { WHO_TO_ASK } from "@/lib/who-to-ask";
import { HEALTH_RULES, INJURY_STEPS } from "@/lib/health";

// Keyword search over everything in the hub. No AI and no API costs: the
// question is split into words, matched against each entry (titles count
// more), and the best few come back with the lines that matched.
// Parent contact details and student names are deliberately left out.

export type SearchHit = { title: string; where: string; href?: string; external?: boolean; lines: string[] };
type Entry = SearchHit & { keywords?: string };

const STOP = new Set(
  "a an and are as at be by can do does for from get go how i if in is it its me my of on or our should so the their them then there this to up us was we what when where which who why will with you your need needs have has any about into out".split(" "),
);

// Words people type that the documents phrase differently.
const SYNONYMS: Record<string, string[]> = {
  missing: ["lost", "search", "searcher"],
  lost: ["missing"],
  guard: ["security"],
  security: ["guard", "clearance"],
  trip: ["off-campus", "off campus", "field"],
  field: ["trip", "off-campus"],
  bus: ["transport", "shuttle"],
  shuttle: ["transport", "bus"],
  car: ["transport"],
  transport: ["shuttle", "bus", "transportation"],
  med: ["medication", "medicine"],
  meds: ["medication", "medicine"],
  medicine: ["medication"],
  sick: ["medical", "medication", "unwell"],
  hurt: ["medical", "injury", "first aid"],
  injury: ["medical", "first aid"],
  parent: ["family", "families"],
  parents: ["family", "families"],
  family: ["parent"],
  visitor: ["guest", "visitors", "check-in"],
  guest: ["visitor", "guests"],
  fire: ["evacuat", "alarm"],
  evacuate: ["evacuat", "fire"],
  lockdown: ["tiger", "shelter"],
  shooter: ["lockdown", "tiger"],
  money: ["vendor", "contract", "legal"],
  contract: ["vendor", "legal"],
  pay: ["vendor", "contract", "money"],
  photo: ["media", "release"],
  video: ["media", "release"],
  lunch: ["food"],
  door: ["access", "badge", "card"],
  badge: ["access", "card"],
  phone: ["contact", "call"],
  call: ["contact", "phone"],
  attendance: ["roster", "headcount"],
  waiver: ["waivers"],
};

function stem(w: string) {
  return w.replace(/(ing|ed|es|s)$/, "").replace(/'s$/, "");
}

function terms(q: string): string[] {
  const words = q.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
  const out = new Set<string>();
  for (const w of words) {
    out.add(stem(w));
    for (const s of SYNONYMS[w] ?? SYNONYMS[stem(w)] ?? []) out.add(stem(s));
  }
  return [...out].filter((t) => t.length > 1);
}

const campusName = (c: string) => (c === "maiden-ln" ? "Maiden Ln" : c === "early-years" ? "Early Years" : "Both campuses");

async function entries(): Promise<Entry[]> {
  const supabase = await createClient();
  const [procs, contacts, staff, resources] = await Promise.all([
    supabase.from("emergency_procedures").select("*").order("sort"),
    supabase.from("emergency_contacts").select("*").order("sort"),
    supabase.from("staff_directory").select("name, title, team, campus").order("name"),
    supabase.from("hub_resources").select("title, category, campus, body").order("title"),
  ]);
  const out: Entry[] = [];

  out.push({ title: "If a student gets injured", where: "Health & safety", href: "/health", lines: INJURY_STEPS, keywords: "injury injured hurt wound cut bleeding fall bump first aid photo" });
  for (const r of HEALTH_RULES) out.push({ title: r.rule, where: "Health & safety rule", href: "/health", lines: [r.detail], keywords: "health safety first aid injury" });

  for (const r of WHO_TO_ASK) out.push({ title: r.topic, where: "Who do I ask?", lines: [`Ask: **${r.who}**`] });

  for (const r of (resources.data ?? []) as { title: string; category: string | null; campus: string; body: string }[]) {
    out.push({ title: r.title, where: `Resources${r.category ? ` · ${r.category}` : ""} · ${campusName(r.campus)}`, lines: r.body.split("\n").filter((l) => l.trim()) });
  }

  for (const p of (procs.data ?? []) as Procedure[]) {
    out.push({ title: p.title, where: `Emergency procedure · ${campusName(p.campus)}`, href: "/emergency", lines: p.body.split("\n").filter((l) => l.trim()) });
  }

  for (const c of (contacts.data ?? []) as Contact[]) {
    out.push({ title: c.name, where: "Emergency contact", href: "/emergency", lines: [[c.role, c.phone, c.email].filter(Boolean).join(" · ")] });
  }

  for (const g of Object.values(GUIDES)) {
    for (const s of g.sections) {
      if (s.checklist) {
        for (const c of s.checklist) {
          out.push({
            title: c.check, where: `${g.title} checklist`, href: c.link?.href ?? `/guides/${g.slug}`, external: !!c.link && /^https?:/.test(c.link.href),
            lines: [`Who helps: **${c.who}**`, ...(c.how ? [c.how] : []), ...(c.link ? [`Open: ${c.link.label}`] : [])],
          });
        }
        continue;
      }
      const lines = [...(s.steps ?? []), ...(s.bullets ?? []), ...(s.table ? s.table.rows.map((r) => r.join(" · ")) : []), ...(s.text ? [s.text] : [])];
      out.push({ title: `${g.title}: ${s.heading}`, where: "One-pager", href: `/guides/${g.slug}`, lines });
    }
  }

  for (const w of WORKSHOPS) {
    out.push({ title: w.title, where: `Workshop · ${w.level}`, href: "/workshops", lines: [w.description, ...(w.offCampus ? [`Off campus: ${w.offCampus}`] : [])] });
  }
  for (const l of LEVELS) out.push({ title: `Level ${l.id}: ${l.name}`, where: "Workshops", href: "/workshops", lines: [`${campusName(l.campus)}. ${l.blocks}`] });

  for (const s of (staff.data ?? []) as Pick<StaffMember, "name" | "title" | "team" | "campus">[]) {
    out.push({ title: s.name, where: "Staff", href: "/staff", lines: [[s.title, s.campus === "unassigned" ? null : campusName(s.campus)].filter(Boolean).join(" · ")] });
  }

  const tools: [string, string | null, string, string][] = [
    ["Off-campus tracker", OFF_CAMPUS_URL, "Plan and clear trips, security clearance, who's out, check students out and back in.", "trip off-campus clearance board"],
    ["Attendance", ATTENDANCE_URL, "Take and check attendance.", "attendance roster headcount absent"],
    ["Transport request", TRANSPORT_URL, "Request shuttles and buses for Maiden Ln and Early Years.", "transport transportation bus shuttle car"],
    ["Parent view (demo)", "/parent-view", "Click through what families see in the Families app.", "parent family families app demo preview"],
  ];
  for (const [title, href, line, keywords] of tools) if (href) out.push({ title, where: "Tool", href, external: /^https?:/.test(href), lines: [line], keywords });

  out.push({ title: "Health & safety", where: "Hub page", href: "/health", lines: ["Student medications, medical emergency steps, first aid and what to carry on trips."], keywords: "health medical medication medicine meds first aid sick nurse allergy injury" });
  return out;
}

export async function search(q: string, limit = 6): Promise<SearchHit[]> {
  const ts = terms(q);
  if (!ts.length) return [];
  const phrase = q.toLowerCase().trim();
  const all = (await entries()).map((e) => ({ e, title: e.title.toLowerCase(), body: `${e.lines.join("\n")} ${e.where} ${e.keywords ?? ""}`.toLowerCase() }));
  // Rare words count more than common ones ("student" is everywhere; "missing" isn't).
  const weight = new Map(ts.map((t) => {
    const df = all.filter((x) => x.title.includes(t) || x.body.includes(t)).length;
    return [t, Math.log((all.length + 1) / (df + 1)) + 0.1];
  }));
  const total = ts.reduce((n, t) => n + weight.get(t)!, 0);
  const scored = all.map(({ e, title, body }) => {
    let score = 0;
    let covered = 0;
    for (const t of ts) {
      const w = weight.get(t)!;
      const inTitle = title.includes(t);
      const inBody = body.includes(t);
      if (inTitle) score += 3 * w;
      if (inBody) score += w;
      if (inTitle || inBody) covered += w;
    }
    if (phrase.length > 3 && (title.includes(phrase) || body.includes(phrase))) score += 4;
    score *= 0.4 + covered / total; // reward covering the important words
    const hitLines = e.lines.filter((l) => ts.some((t) => l.toLowerCase().includes(t)));
    const lines = (hitLines.length ? hitLines : e.lines).slice(0, 4);
    return { e: { ...e, lines }, score };
  });
  const ranked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? 0;
  // Drop weak tail matches so the list stays relevant.
  return ranked
    .filter((s) => s.score >= best * 0.25)
    .slice(0, limit)
    .map(({ e }) => ({ title: e.title, where: e.where, href: e.href, external: e.external, lines: e.lines }));
}
