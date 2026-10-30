"use server";

import { redirect } from "next/navigation";
import { currentFamily } from "@/lib/parent-session";
import { applyParentHubPickup } from "@/lib/ey-server";
import { hubUrl, kindById, notifySlack, readDetails } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export async function parentSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/parents/sign-in");
}

export async function submitParentRequest(form: FormData) {
  const family = await currentFamily();
  if (!family) redirect("/parents/sign-in");
  const kind = kindById(s(form, "kind"));
  if (!kind || kind.audience !== "parent") redirect("/parents?err=Pick a form first.");
  const child = family.children.find((c) => c.student === s(form, "student")) ?? (family.children.length === 1 ? family.children[0] : null);
  if (!child) redirect(`/parents/new/${kind.id}?err=${encodeURIComponent("Choose your child.")}`);
  const { details, missing } = readDetails(kind, form);
  if (missing.length) redirect(`/parents/new/${kind.id}?err=${encodeURIComponent(`Please fill in: ${missing.join(", ")}`)}`);

  const to = kind.route(child.campus, details);
  const source = family.preview ? "preview" : "parent";
  // RLS checks the sender: families only for their own children, staff previews as themselves.
  const supabase = await createClient();
  const res = await supabase.from("requests").insert({
    source, kind: kind.id, campus: child.campus, student: child.student,
    from_name: family.name, from_email: family.email, details, route_to: to.map((p) => p.name).join(", "),
  });
  if (res.error) {
    console.error("parent request insert failed", res.error.message);
    redirect(`/parents/new/${kind.id}?err=${encodeURIComponent("That didn't send. Please try again, or contact the Campus Coordinator.")}`);
  }
  // Early Years pickup changes go straight onto that day's dismissal list.
  if (kind.id === "pickup" && child.campus === "early-years" && !family.preview) {
    try { await applyParentHubPickup(child.student, details, family.name ?? family.email); }
    catch (e) { console.error("ey: parent hub pickup not applied", e); }
  }
  await notifySlack({
    kind, source, campus: child.campus, student: child.student,
    fromName: family.name, fromEmail: family.email, details, to, link: hubUrl("/requests"),
  });
  redirect(`/parents?sent=${kind.id}`);
}
