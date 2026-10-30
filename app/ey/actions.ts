"use server";

import { requireMember } from "@/lib/access";
import { MODE_LABEL, dayLabel, nyDate, type DayMode } from "@/lib/ey";
import { escSlack, hubUrl, postSlack } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

// A one-day change made in the app ("usual" clears it). It also posts to the
// shared Slack channel so a change made at the door reaches everyone.
export async function setDayMode(studentId: number, mode: DayMode | "usual", note: string): Promise<{ ok: boolean }> {
  const me = await requireMember();
  const supabase = await createClient();
  const day = nyDate();
  const by = me.name ?? me.email;
  const res = mode === "usual"
    ? await supabase.from("ey_travel_day").delete().eq("student_id", studentId).eq("day", day)
    : await supabase.from("ey_travel_day").upsert({ student_id: studentId, day, mode, note: note.trim().slice(0, 300) || null, updated_by: by, updated_at: new Date().toISOString() });
  if (res.error) { console.error("ey: day change failed", res.error.message); return { ok: false }; }

  const { data: s } = await supabase.from("students").select("first_name, last_name").eq("id", studentId).maybeSingle();
  if (s) {
    const what = mode === "usual" ? "back to usual" : `*${MODE_LABEL[mode]}*`;
    await postSlack(`🔄 *${escSlack(`${s.first_name} ${s.last_name}`)}*: ${what} ${dayLabel(day)}${note.trim() ? `\n> ${escSlack(note.trim())}` : ""}\n_by ${escSlack(by)} in the app · <${hubUrl("/ey")}|Open EY attendance>_`);
  }
  return { ok: true };
}
