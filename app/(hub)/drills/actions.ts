"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EDITORS, requireMember, requireRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

const KINDS = ["fire", "lockdown", "evacuation", "shelter", "other"];
const num = (v: FormDataEntryValue | null) => { const n = Number(v); return v === null || v === "" || !Number.isFinite(n) ? null : Math.round(n); };

export async function logDrill(form: FormData) {
  const me = await requireMember();
  const campus = String(form.get("campus") ?? "");
  const kind = String(form.get("kind") ?? "");
  const held_on = String(form.get("held_on") ?? "");
  if (!["maiden-ln", "early-years"].includes(campus) || !KINDS.includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(held_on)) redirect("/drills?err=Pick+a+campus,+drill+and+date.");
  const supabase = await createClient();
  const { error } = await supabase.from("hub_drills").insert({
    campus, kind, held_on,
    minutes: num(form.get("minutes")), headcount: num(form.get("headcount")),
    all_accounted: form.get("all_accounted") === "yes",
    went_well: String(form.get("went_well") ?? "").trim().slice(0, 1000) || null,
    to_fix: String(form.get("to_fix") ?? "").trim().slice(0, 1000) || null,
    logged_by: me.name ?? me.email,
  });
  if (error) redirect(`/drills?err=${encodeURIComponent("That didn't save: " + error.message)}`);
  revalidatePath("/drills");
  redirect("/drills?msg=Drill+logged.+Thank+you.");
}

export async function removeDrill(form: FormData) {
  await requireRole(EDITORS);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) redirect("/drills");
  await (await createClient()).from("hub_drills").delete().eq("id", id);
  revalidatePath("/drills");
  redirect("/drills?msg=Removed.");
}
