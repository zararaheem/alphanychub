"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMINS, requireRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

// Admins update what the assistant answers from. The database lets only admins write.
export async function saveDoc(form: FormData) {
  const me = await requireRole(ADMINS);
  const key = String(form.get("key") ?? "");
  if (key !== "handbook" && key !== "campus_notes") redirect("/ask/knowledge?err=Unknown+document");
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 20) redirect("/ask/knowledge?err=That+looks+empty.+Nothing+was+saved.");
  const url = String(form.get("source_url") ?? "").trim() || null;
  const title = key === "handbook" ? "Alpha Anywhere Center - Policies and Procedures" : "Campus know-how";
  const supabase = await createClient();
  const { error } = await supabase.from("hub_docs").upsert({ key, title, body: body.slice(0, 300000), source_url: url, updated_by: me.name ?? me.email, updated_at: new Date().toISOString() });
  if (error) redirect(`/ask/knowledge?err=${encodeURIComponent("That didn't save: " + error.message)}`);
  revalidatePath("/ask/knowledge");
  redirect(`/ask/knowledge?msg=${key === "handbook" ? "Handbook+saved" : "Know-how+saved"}.+The+assistant+uses+it+from+the+next+question.`);
}
