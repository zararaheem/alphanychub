"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember, requireRole, type Role } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

// Every write below runs as the signed-in user, so Supabase RLS is the real
// gate; the requireMember/requireRole calls just fail fast with a clear message.

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v && /^\d+$/.test(v) ? Number(v) : null;
};
const scope = (f: FormData) => {
  const v = str(f, "campus");
  return v === "maiden-ln" || v === "early-years" ? v : "all";
};

function back(path: string, result: { error: { message: string } | null }, ok: string): never {
  revalidatePath("/", "layout");
  const q = result.error ? `err=${encodeURIComponent(result.error.message)}` : `msg=${encodeURIComponent(ok)}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

const EDITORS: Role[] = ["admin", "lead"];

// Emergency contacts ---------------------------------------------------------
export async function saveContact(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const id = num(form, "id");
  const row = {
    campus: scope(form), name: str(form, "name") ?? "Unnamed", role: str(form, "role"),
    phone: str(form, "phone"), email: str(form, "email"), notes: str(form, "notes"), sort: num(form, "sort") ?? 0,
  };
  const res = id
    ? await supabase.from("emergency_contacts").update(row).eq("id", id)
    : await supabase.from("emergency_contacts").insert(row);
  back("/emergency", res, id ? "Contact updated." : "Contact added.");
}

export async function deleteContact(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("emergency_contacts").delete().eq("id", num(form, "id") ?? -1);
  back("/emergency", res, "Contact removed.");
}

// Emergency procedures -------------------------------------------------------
export async function saveProcedure(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const id = num(form, "id");
  const row = {
    campus: scope(form), title: str(form, "title") ?? "Untitled procedure",
    body: str(form, "body") ?? "", sort: num(form, "sort") ?? 0, updated_at: new Date().toISOString(),
  };
  const res = id
    ? await supabase.from("emergency_procedures").update(row).eq("id", id)
    : await supabase.from("emergency_procedures").insert(row);
  back("/emergency", res, id ? "Procedure updated." : "Procedure added.");
}

export async function deleteProcedure(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("emergency_procedures").delete().eq("id", num(form, "id") ?? -1);
  back("/emergency", res, "Procedure removed.");
}

// Workshops ------------------------------------------------------------------
export async function saveWorkshop(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const id = num(form, "id");
  const row = {
    campus: scope(form), day: str(form, "day"), start_time: str(form, "start_time"), end_time: str(form, "end_time"),
    topic: str(form, "topic") ?? "Untitled", notes: str(form, "notes"),
  };
  if (!row.day) back("/workshops", { error: { message: "Pick a day for the workshop." } }, "");
  const res = id
    ? await supabase.from("workshops").update(row).eq("id", id)
    : await supabase.from("workshops").insert(row);
  back("/workshops", res, id ? "Workshop updated." : "Workshop added.");
}

export async function deleteWorkshop(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("workshops").delete().eq("id", num(form, "id") ?? -1);
  back("/workshops", res, "Workshop removed.");
}

// Access list (admins) -------------------------------------------------------
export async function addMember(form: FormData) {
  const me = await requireRole(["admin"]);
  const supabase = await createClient();
  const email = str(form, "email")?.toLowerCase();
  const role = str(form, "role");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back("/access", { error: { message: "Enter a valid email." } }, "");
  if (!role || !["admin", "lead", "guide", "staff"].includes(role)) back("/access", { error: { message: "Pick a role." } }, "");
  const res = await supabase
    .from("allowed_users")
    .upsert({ email, role, name: str(form, "name"), added_by: me.email }, { onConflict: "email" });
  back("/access", res, `${email} can now sign in.`);
}

export async function removeMember(form: FormData) {
  const me = await requireRole(["admin"]);
  const email = str(form, "email");
  if (email === me.email) back("/access", { error: { message: "You can't remove yourself." } }, "");
  const supabase = await createClient();
  const res = await supabase.from("allowed_users").delete().eq("email", email ?? "");
  back("/access", res, `${email} no longer has access.`);
}
