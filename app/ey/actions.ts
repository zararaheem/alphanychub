"use server";

import { requireMember } from "@/lib/access";
import { dayLabel, label, nyDate, type DayMode, type Part } from "@/lib/ey";
import { escSlack, hubUrl, postSlack } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

// A change for this morning or this dismissal, made in the app. Absent covers
// the whole day; "usual" clears the change (and an absence from both parts).
// It also posts to the shared Slack channel so a change made at the door reaches everyone.
export async function setDayMode(studentId: number, part: Part, mode: DayMode | "usual", note: string): Promise<{ ok: boolean }> {
  const me = await requireMember();
  const supabase = await createClient();
  const day = nyDate();
  const by = me.name ?? me.email;
  const base = { student_id: studentId, day, mode, note: note.trim().slice(0, 300) || null, updated_by: by, updated_at: new Date().toISOString() };

  let error;
  if (mode === "usual") {
    const { data: rows } = await supabase.from("ey_travel_day").select("part, mode").eq("student_id", studentId).eq("day", day);
    const wasAbsent = (rows ?? []).some((r) => r.mode === "absent");
    let q = supabase.from("ey_travel_day").delete().eq("student_id", studentId).eq("day", day);
    if (!wasAbsent) q = q.eq("part", part);
    ({ error } = await q);
  } else if (mode === "absent") {
    ({ error } = await supabase.from("ey_travel_day").upsert([{ ...base, part: "am" }, { ...base, part: "pm" }]));
  } else {
    ({ error } = await supabase.from("ey_travel_day").upsert({ ...base, part }));
  }
  if (error) { console.error("ey: day change failed", error.message); return { ok: false }; }

  const { data: s } = await supabase.from("students").select("first_name, last_name").eq("id", studentId).maybeSingle();
  if (s) {
    const what = mode === "usual" ? "back to usual" : `*${label(mode, part)}*`;
    const when = mode === "absent" ? " (all day)" : part === "am" ? " (morning)" : " (dismissal)";
    await postSlack(`🔄 *${escSlack(`${s.first_name} ${s.last_name}`)}*: ${what} ${dayLabel(day)}${when}${note.trim() ? `\n> ${escSlack(note.trim())}` : ""}\n_by ${escSlack(by)} in the app · <${hubUrl("/ey")}|Open EY attendance>_`);
  }
  return { ok: true };
}
