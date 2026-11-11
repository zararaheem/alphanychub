"use server";

import { revalidatePath } from "next/cache";
import { requireTracker } from "@/lib/access";
import { LEVELS, nyToday, type AreaId, type Cycle, type Level, type Support } from "@/lib/montessori";
import { createClient } from "@/lib/supabase/server";

const AREA_IDS: AreaId[] = ["pl", "se", "ma", "la", "sc"];

// Logs one work for one or more children (a group lesson logs for each) and
// moves each child's level on that work to the level observed.
export async function logWork(input: {
  studentIds: number[]; workId: number; level: Level | null; cycle: Cycle | null; support: Support | null;
  note: string; highlight: boolean; day?: string; photos?: string[]; ocrText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const me = await requireTracker();
  const ids = [...new Set(input.studentIds)].filter((n) => Number.isInteger(n));
  if (!ids.length || !Number.isInteger(input.workId)) return { ok: false, error: "Pick a child and a work." };
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

  if (level) {
    const { error: e2 } = await supabase.from("ey_work_status").upsert(ids.map((student_id) => ({
      student_id, work_id: input.workId, level, updated_by: by, updated_at: new Date().toISOString(),
    })));
    if (e2) console.error("tracker: level not saved", e2.message);
  }
  revalidatePath("/tracker/report");
  return { ok: true };
}

export async function deleteObservation(id: number): Promise<{ ok: boolean }> {
  await requireTracker();
  const supabase = await createClient();
  const { error } = await supabase.from("ey_observations").delete().eq("id", id);
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

// Adds or edits a work in the list (name, area, description), or archives it.
export async function saveWork(input: { id?: number; area: AreaId; name: string; description: string; archived?: boolean }): Promise<{ ok: boolean; id?: number; error?: string }> {
  const me = await requireTracker();
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Give the work a name." };
  if (!AREA_IDS.includes(input.area)) return { ok: false, error: "Pick an area." };
  const supabase = await createClient();
  const row = {
    area: input.area, name, description: input.description.trim().slice(0, 600) || null,
    archived: !!input.archived, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  };
  const res = input.id
    ? await supabase.from("ey_works").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("ey_works").insert({ ...row, sort: 100 }).select("id").single();
  if (res.error) { console.error("tracker: work not saved", res.error.message); return { ok: false, error: "That didn't save." }; }
  return { ok: true, id: res.data.id };
}
