"use server";

import { redirect } from "next/navigation";
import { currentFamily, sendCode, signOutParent, verifyCode } from "@/lib/parent-session";
import { hubUrl, kindById, notifySlack, readDetails } from "@/lib/requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export async function requestParentCode(form: FormData) {
  const email = s(form, "email");
  const result = await sendCode(email);
  if (result === "not-ready") redirect("/parents/sign-in?err=not-ready");
  if (result === "wait") redirect(`/parents/sign-in?step=code&email=${encodeURIComponent(email)}&err=wait`);
  redirect(`/parents/sign-in?step=code&email=${encodeURIComponent(email)}`);
}

export async function checkParentCode(form: FormData) {
  const email = s(form, "email");
  if (!(await verifyCode(email, s(form, "code")))) {
    redirect(`/parents/sign-in?step=code&email=${encodeURIComponent(email)}&err=code`);
  }
  redirect("/parents");
}

export async function parentSignOut() {
  await signOutParent();
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
  const row = {
    source: family.preview ? "preview" : "parent", kind: kind.id, campus: child.campus, student: child.student,
    from_name: family.name, from_email: family.email, details, route_to: to.map((p) => p.name).join(", "),
  };
  // Families have no Supabase session, so their rows go in server-side; staff previews go in as themselves.
  const db = family.preview ? await createClient() : createAdminClient();
  const res = db ? await db.from("requests").insert(row) : { error: { message: "The Parent Hub isn't fully set up yet." } };
  if (res.error) {
    console.error("parent request insert failed", res.error.message);
    redirect(`/parents/new/${kind.id}?err=${encodeURIComponent("That didn't send. Please try again, or contact the Campus Coordinator.")}`);
  }
  await notifySlack({
    kind, source: family.preview ? "preview" : "parent", campus: child.campus, student: child.student,
    fromName: family.name, fromEmail: family.email, details, to, link: hubUrl("/requests"),
  });
  redirect(`/parents?sent=${kind.id}`);
}
