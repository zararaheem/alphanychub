"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EDITORS, requireMember, requireRole } from "@/lib/access";
import { hubUrl, kindById, notifySlack, readDetails, type Campus } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export async function submitStaffRequest(form: FormData) {
  const me = await requireMember();
  const kind = kindById(s(form, "kind"));
  if (!kind || kind.audience !== "staff") redirect("/requests?err=Pick a form first.");
  const { details, missing } = readDetails(kind, form);
  if (missing.length) redirect(`/requests?new=${kind.id}&err=${encodeURIComponent(`Please fill in: ${missing.join(", ")}`)}`);
  const c = s(form, "campus");
  const campus: Campus | null = c === "maiden-ln" || c === "early-years" ? c : null;
  const to = kind.route(campus, details);
  const supabase = await createClient();
  const res = await supabase.from("requests").insert({
    source: "staff", kind: kind.id, campus, from_name: me.name, from_email: me.email, details, route_to: to.map((p) => p.name).join(", "),
  });
  if (res.error) redirect(`/requests?new=${kind.id}&err=${encodeURIComponent(res.error.message)}`);
  await notifySlack({ kind, source: "staff", campus, student: null, fromName: me.name, fromEmail: me.email, details, to, link: hubUrl("/requests") });
  revalidatePath("/requests");
  redirect(`/requests?msg=${encodeURIComponent(`Sent to ${to.map((p) => p.name.split(" ")[0]).join(" and ")}.`)}`);
}

export async function updateRequest(form: FormData) {
  const me = await requireRole(EDITORS);
  const id = Number(s(form, "id"));
  const status = s(form, "status");
  if (!id || !["new", "in-progress", "done"].includes(status)) redirect("/requests?err=Something was missing.");
  const supabase = await createClient();
  const res = await supabase.from("requests").update({
    status, staff_note: s(form, "staff_note").slice(0, 1000) || null, updated_by: me.name ?? me.email, updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/requests");
  const back = s(form, "back") || "/requests";
  redirect(`${back}${back.includes("?") ? "&" : "?"}${res.error ? `err=${encodeURIComponent(res.error.message)}` : "msg=Saved."}#r${id}`);
}
