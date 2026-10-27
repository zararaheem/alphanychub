import { createClient } from "@/lib/supabase/server";
import { GUIDES } from "@/lib/guides";
import { LEVELS, SESSION, SHOWCASES, WEEKLY, WORKSHOPS, MOMA_DATES, LOCATIONS } from "@/lib/session2";
import { ATTENDANCE_URL, OFF_CAMPUS_URL, PARENT_VIEW_URL, TRANSPORT_URL } from "@/lib/links";
import type { Contact, Procedure, StaffMember } from "@/lib/types";

// Everything the Ask assistant may answer from, as one plain-text document.
// Parent contact details and student names are deliberately left out.
export async function buildKnowledge(): Promise<string> {
  const supabase = await createClient();
  const [procs, contacts, staff, resources, students] = await Promise.all([
    supabase.from("emergency_procedures").select("*").order("sort"),
    supabase.from("emergency_contacts").select("*").order("sort"),
    supabase.from("staff_directory").select("name, title, team, campus").order("name"),
    supabase.from("hub_resources").select("title, category, campus, body, updated_at").order("category").order("title"),
    supabase.from("students").select("level, campus"),
  ]);

  const out: string[] = [];
  const campusName = (c: string) => (c === "maiden-ln" ? "Maiden Ln" : c === "early-years" ? "Early Years / William St" : "both campuses");

  out.push("# Resource library (added by admins)");
  for (const r of (resources.data ?? []) as { title: string; category: string | null; campus: string; body: string }[]) {
    out.push(`## ${r.title}${r.category ? ` [${r.category}]` : ""} (${campusName(r.campus)})\n${r.body}`);
  }

  out.push("# Emergency procedures (from the Emergency Action Plan)");
  for (const p of (procs.data ?? []) as Procedure[]) out.push(`## ${p.title} (${campusName(p.campus)})\n${p.body}`);

  out.push("# Immediate emergency contacts");
  for (const c of (contacts.data ?? []) as Contact[]) {
    out.push(`- ${c.name}${c.role ? `, ${c.role}` : ""} (${campusName(c.campus)})${c.phone ? `, phone ${c.phone}` : ""}${c.email ? `, email ${c.email}` : ""}${c.notes ? `. ${c.notes}` : ""}`);
  }

  out.push("# One-pagers");
  for (const g of Object.values(GUIDES)) {
    out.push(`## ${g.title}\n${g.intro}`);
    for (const s of g.sections) {
      const lines = [...(s.steps ?? []).map((t, i) => `${i + 1}. ${t}`), ...(s.bullets ?? []).map((t) => `- ${t}`)];
      if (s.table) lines.push(`${s.table.head.join(" | ")}`, ...s.table.rows.map((r) => r.join(" | ")));
      if (s.text) lines.push(s.text);
      if (s.todo) lines.push(`(Not written yet: ${s.todo})`);
      out.push(`### ${s.heading}\n${lines.join("\n")}`);
    }
  }

  out.push(`# ${SESSION.name} workshops (${SESSION.dates})`);
  for (const l of LEVELS) out.push(`Level ${l.id} (${l.name}) meets at ${campusName(l.campus)}. ${l.blocks}`);
  for (const w of WORKSHOPS) {
    out.push(`## ${w.title} (${w.level}, skill: ${w.skill})\n${w.description}${w.alphatest ? `\nAlphaTest: ${w.alphatest}` : ""}${w.partners ? `\nPartners: ${w.partners}` : ""}${w.offCampus ? `\nOff campus: ${w.offCampus}` : ""}`);
  }
  for (const [lv, days] of Object.entries(WEEKLY)) out.push(`Weekly schedule ${lv}: ${days!.map((d) => `${d.day}: ${d.blocks.join("; ")}`).join(" | ")}`);
  out.push(`Showcases: ${SHOWCASES.map((s) => `${s.date} ${s.levels} ${s.time}${s.place ? ` at ${s.place}` : ""}`).join("; ")}`);
  out.push(`MoMA dates: ${MOMA_DATES}. Locations: ${LOCATIONS.join("; ")}`);

  out.push("# Staff directory");
  for (const s of (staff.data ?? []) as Pick<StaffMember, "name" | "title" | "team" | "campus">[]) {
    out.push(`- ${s.name}${s.title ? `, ${s.title}` : ""}${s.team ? ` (${s.team})` : ""}, ${s.campus === "unassigned" ? "campus not assigned" : campusName(s.campus)}`);
  }

  const counts: Record<string, number> = {};
  for (const s of (students.data ?? []) as { level: string | null }[]) counts[s.level ?? "Other"] = (counts[s.level ?? "Other"] ?? 0) + 1;
  out.push(`# Enrollment\n${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ")} (total ${students.data?.length ?? 0})`);

  out.push(`# Other tools\n- Off-campus board: ${OFF_CAMPUS_URL ?? "not linked"}\n- Attendance: ${ATTENDANCE_URL ?? "not linked"}\n- Transport request tool (both campuses): ${TRANSPORT_URL}\n- Parent view (Families app): ${PARENT_VIEW_URL}`);
  return out.join("\n\n");
}
