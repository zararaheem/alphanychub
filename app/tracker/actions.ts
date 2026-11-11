"use server";

import { revalidatePath } from "next/cache";
import { isTrackerOwner, requireTracker } from "@/lib/access";
import { DOMAINS, LEVELS, SKILL_LEVELS, nyToday, type AreaId, type Cycle, type DomainId, type Level, type SkillLevel, type Support } from "@/lib/montessori";
import { randomInt } from "node:crypto";
import { passwordStem } from "@/lib/parent-report";
import { hubUrl } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

const AREA_IDS: AreaId[] = ["pl", "se", "ma", "la", "sc"];

// Logs one work for one or more children (a group lesson logs for each) and
// moves each child's level on that work to the level observed.
export async function logWork(input: {
  studentIds: number[]; workId: number | null; level: Level | null; cycle: Cycle | null; support: Support | null;
  note: string; highlight: boolean; day?: string; photos?: string[]; ocrText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const me = await requireTracker();
  const ids = [...new Set(input.studentIds)].filter((n) => Number.isInteger(n));
  const hasEvidence = !!input.note.trim() || !!input.ocrText?.trim() || (input.photos ?? []).length > 0;
  if (!ids.length) return { ok: false, error: "Pick a child." };
  // A lesson, or a standout moment on its own (a photo, scan or note).
  if (input.workId !== null && !Number.isInteger(input.workId)) return { ok: false, error: "Pick a lesson." };
  if (input.workId === null && !hasEvidence) return { ok: false, error: "Pick a lesson, or add a photo or a note." };
  const level = input.level && LEVELS.includes(input.level) ? input.level : null;
  const day = input.day && /^\d{4}-\d{2}-\d{2}$/.test(input.day) && input.day <= nyToday() ? input.day : nyToday();
  const supabase = await createClient();
  const by = me.name ?? me.email;

  const { error } = await supabase.from("ey_observations").insert(ids.map((student_id) => ({
    student_id, work_id: input.workId, day, level,
    cycle: input.cycle === "brief" || input.cycle === "complete" ? input.cycle : null,
    support: input.support === "self" || input.support === "invited" || input.support === "lesson" ? input.support : null,
    note: input.note.trim().slice(0, 1000) || null, highlight: !!input.highlight, by_email: me.email, by_name: by,
    // Paths in the private ey-work bucket, uploaded from the guide's phone.
    photos: (input.photos ?? []).filter((p) => /^[\w\-/]+\.\w+$/.test(p)).slice(0, 8),
    ocr_text: input.ocrText?.trim().slice(0, 4000) || null,
  })));
  if (error) { console.error("tracker: log failed", error.message); return { ok: false, error: "That didn't save. Try again." }; }

  if (level && input.workId !== null) {
    const { error: e2 } = await supabase.from("ey_work_status").upsert(ids.map((student_id) => ({
      student_id, work_id: input.workId!, level, updated_by: by, updated_at: new Date().toISOString(),
    })));
    if (e2) console.error("tracker: level not saved", e2.message);
  }
  revalidatePath("/tracker/report");
  return { ok: true };
}

export async function deleteObservation(id: number): Promise<{ ok: boolean }> {
  await requireTracker();
  const supabase = await createClient();
  const { data: old } = await supabase.from("ey_observations").select("photos").eq("id", id).maybeSingle();
  const { error } = await supabase.from("ey_observations").delete().eq("id", id);
  // Its photos go too, so nothing is left behind in storage.
  if (!error && old?.photos?.length) await supabase.storage.from("ey-work").remove(old.photos as string[]);
  return { ok: !error };
}

// Sets a child's level on a work without logging an observation.
export async function setLevel(studentId: number, workId: number, level: Level): Promise<{ ok: boolean }> {
  const me = await requireTracker();
  if (!LEVELS.includes(level)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("ey_work_status").upsert({
    student_id: studentId, work_id: workId, level, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  });
  return { ok: !error };
}

const clip = (v: string | undefined, n: number) => (v ?? "").trim().slice(0, n) || null;

// Adds or edits a lesson in the knowledge base, or takes it off the list.
export async function saveWork(input: {
  id?: number; area: AreaId; name: string; strand?: string; description?: string; direct_aim?: string; indirect_aims?: string;
  evidence?: string; elof?: string; checks?: string; archived?: boolean;
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const me = await requireTracker();
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Give the lesson a name." };
  if (!AREA_IDS.includes(input.area)) return { ok: false, error: "Pick an area." };
  const supabase = await createClient();
  const row = {
    area: input.area, name, strand: clip(input.strand, 80), description: clip(input.description, 600),
    direct_aim: clip(input.direct_aim, 300), indirect_aims: clip(input.indirect_aims, 300), evidence: clip(input.evidence, 400),
    elof: clip(input.elof, 120), checks: clip(input.checks, 120),
    archived: !!input.archived, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  };
  const res = input.id
    ? await supabase.from("ey_works").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("ey_works").insert({ ...row, sort: 500 }).select("id").single();
  if (res.error) { console.error("tracker: lesson not saved", res.error.message); return { ok: false, error: "That didn't save." }; }
  return { ok: true, id: res.data.id };
}

// Adds or edits a skill (success indicator), or takes it off the list.
export async function saveSkill(input: {
  id?: number; domain: DomainId; name: string; indicator?: string; benchmark?: string; ican?: string; home_support?: string; archived?: boolean;
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const me = await requireTracker();
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Give the skill a name." };
  if (!DOMAINS.some((d) => d.id === input.domain)) return { ok: false, error: "Pick a domain." };
  const supabase = await createClient();
  const row = {
    domain: input.domain, name, indicator: clip(input.indicator, 600), benchmark: clip(input.benchmark, 600),
    ican: clip(input.ican, 300), home_support: clip(input.home_support, 400),
    archived: !!input.archived, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const res = await supabase.from("ey_skills").update(row).eq("id", input.id).select("id").single();
    if (res.error) return { ok: false, error: "That didn't save." };
    return { ok: true, id: res.data.id };
  }
  // New skills get the next code in their domain, e.g. ATL-14.
  const prefix = input.domain === "COG" ? "COG" : input.domain;
  const { count } = await supabase.from("ey_skills").select("id", { count: "exact", head: true }).eq("domain", input.domain);
  const res = await supabase.from("ey_skills").insert({ ...row, code: `${prefix}-N${(count ?? 0) + 1}`, sort: 500 }).select("id").single();
  if (res.error) { console.error("tracker: skill not saved", res.error.message); return { ok: false, error: "That didn't save." }; }
  return { ok: true, id: res.data.id };
}

// Links or unlinks a lesson and a skill it builds.
export async function linkSkill(skillId: number, workId: number, on: boolean): Promise<{ ok: boolean }> {
  await requireTracker();
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("ey_skill_works").upsert({ skill_id: skillId, work_id: workId })
    : await supabase.from("ey_skill_works").delete().eq("skill_id", skillId).eq("work_id", workId);
  return { ok: !error };
}

// Sets where one or more children are on a skill.
export async function setSkillLevel(studentIds: number[], skillId: number, level: SkillLevel): Promise<{ ok: boolean }> {
  const me = await requireTracker();
  if (!SKILL_LEVELS.includes(level)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("ey_skill_status").upsert(studentIds.map((student_id) => ({
    student_id, skill_id: skillId, level, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  })));
  revalidatePath("/tracker/parent");
  return { ok: !error };
}

// The guide's message on a child's parent report.
export async function saveReportNote(studentId: number, periodStart: string, note: string): Promise<{ ok: boolean }> {
  const me = await requireTracker();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("ey_report_notes").upsert({
    student_id: studentId, period_start: periodStart, note: note.trim().slice(0, 1500) || null,
    updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  });
  revalidatePath("/tracker/parent");
  return { ok: !error };
}

// Superadmin: approve or remove someone's access to the tracker.
export async function setTrackerAccessFor(email: string, on: boolean): Promise<{ ok: boolean }> {
  const me = await requireTracker();
  if (!(await isTrackerOwner())) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_users").update({ tracker: on }).eq("email", email.toLowerCase());
  return { ok: !error };
}

// Superadmin: add someone to the tracker (and the hub, as a guide if they're new),
// or change their class.
export async function addTrackerPerson(input: { email: string; name: string; eyClass: "PK" | "K" | null }): Promise<{ ok: boolean; error?: string }> {
  const me = await requireTracker();
  if (!(await isTrackerOwner())) return { ok: false, error: "Only the tracker owner can add people." };
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@alpha\.school$/.test(email)) return { ok: false, error: "Use their @alpha.school email." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("allowed_users").select("email").eq("email", email).maybeSingle();
  const eyClass = input.eyClass === "PK" || input.eyClass === "K" ? input.eyClass : null;
  const res = existing
    ? await supabase.from("allowed_users").update({ tracker: true, ey_class: eyClass, ...(input.name.trim() ? { name: input.name.trim() } : {}) }).eq("email", email)
    : await supabase.from("allowed_users").insert({ email, name: input.name.trim() || null, role: "guide", tracker: true, ey_class: eyClass, added_by: me.email });
  if (res.error) { console.error("tracker: add person failed", res.error.message); return { ok: false, error: "That didn't save." }; }
  return { ok: true };
}

export async function setTrackerClass(email: string, eyClass: "PK" | "K" | null): Promise<{ ok: boolean }> {
  const me = await requireTracker();
  if (!(await isTrackerOwner())) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_users").update({ ey_class: eyClass === "PK" || eyClass === "K" ? eyClass : null }).eq("email", email.toLowerCase());
  return { ok: !error };
}

// A password-protected link to a child's weekly report for their family.
// The password is Lastname-1234; only its hash is stored.
export async function shareReport(studentId: number, periodStart: string): Promise<{ ok: boolean; url?: string; password?: string; error?: string }> {
  const me = await requireTracker();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { ok: false, error: "Pick a week." };
  const supabase = await createClient();
  const { data: kid } = await supabase.from("students").select("last_name").eq("id", studentId).in("campus", ["early-years", "demo"]).maybeSingle();
  if (!kid) return { ok: false, error: "Child not found." };
  const digits = String(randomInt(1000, 10000));
  const password = `${passwordStem(kid.last_name)}-${digits}`;
  const { data: token, error } = await supabase.rpc("ey_create_share", { p_student: studentId, p_period: periodStart, p_password: password, p_by: me.name ?? me.email });
  if (error || !token) { console.error("tracker: share failed", error?.message); return { ok: false, error: "Couldn't make the link." }; }
  return { ok: true, url: hubUrl(`/r/${token}`), password };
}

// Fixes a recorded entry: level, note, standout, the writing, and its photos.
// Photos taken off the entry are deleted from storage too.
export async function updateObservation(id: number, input: {
  level: Level | null; note: string; highlight: boolean; ocrText: string; photos: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const me = await requireTracker();
  const supabase = await createClient();
  const { data: old } = await supabase.from("ey_observations").select("student_id, work_id, photos").eq("id", id).maybeSingle();
  if (!old) return { ok: false, error: "That entry is gone." };
  const photos = input.photos.filter((p) => /^[\w\-/]+\.\w+$/.test(p)).slice(0, 8);
  const level = old.work_id && input.level && LEVELS.includes(input.level) ? input.level : null;
  const { error } = await supabase.from("ey_observations").update({
    level, note: input.note.trim().slice(0, 1000) || null, highlight: !!input.highlight,
    ocr_text: input.ocrText.trim().slice(0, 4000) || null, photos,
  }).eq("id", id);
  if (error) { console.error("tracker: edit failed", error.message); return { ok: false, error: "That didn't save." }; }
  const removed = ((old.photos ?? []) as string[]).filter((p) => !photos.includes(p));
  if (removed.length) await supabase.storage.from("ey-work").remove(removed);
  if (level && old.work_id) {
    await supabase.from("ey_work_status").upsert({ student_id: old.student_id, work_id: old.work_id, level, updated_by: me.name ?? me.email, updated_at: new Date().toISOString() });
  }
  revalidatePath("/tracker/report");
  return { ok: true };
}

// Everything added, changed or removed in the tracker and attendance. Owner only (the database enforces it too).
export type Activity = { id: number; at: string; actor: string; action: "added" | "changed" | "removed"; table_name: string; row_key: string | null; student_id: number | null; details: Record<string, unknown> };
export async function activityLog(before?: number): Promise<{ ok: boolean; rows: Activity[] }> {
  await requireTracker();
  if (!(await isTrackerOwner())) return { ok: false, rows: [] };
  const supabase = await createClient();
  let q = supabase.from("ey_activity").select("*").order("id", { ascending: false }).limit(200);
  if (before && Number.isInteger(before)) q = q.lt("id", before);
  const { data, error } = await q;
  return { ok: !error, rows: (data ?? []) as Activity[] };
}
