"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMINS, EDITORS, STAFF_MANAGERS, ROLE_LABELS, requireMember, requireRole, type Role } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { parseParentCsv } from "@/lib/parent-import";
import { parseStaffCsv } from "@/lib/staff-import";

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
  back("/emergency?edit=contacts", res, id ? "Contact updated." : "Contact added.");
}

export async function deleteContact(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("emergency_contacts").delete().eq("id", num(form, "id") ?? -1);
  back("/emergency?edit=contacts", res, "Contact removed.");
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
  back("/emergency?edit=procedures", res, id ? "Procedure updated." : "Procedure added.");
}

export async function deleteProcedure(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("emergency_procedures").delete().eq("id", num(form, "id") ?? -1);
  back("/emergency?edit=procedures", res, "Procedure removed.");
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
  if (!row.day) back("/workshops?view=staff", { error: { message: "Pick a day for the workshop." } }, "");
  const res = id
    ? await supabase.from("workshops").update(row).eq("id", id)
    : await supabase.from("workshops").insert(row);
  back("/workshops?view=staff", res, id ? "Workshop updated." : "Workshop added.");
}

export async function deleteWorkshop(form: FormData) {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const res = await supabase.from("workshops").delete().eq("id", num(form, "id") ?? -1);
  back("/workshops?view=staff", res, "Workshop removed.");
}

// Access list (admins) -------------------------------------------------------
export async function addMember(form: FormData) {
  const me = await requireRole(ADMINS);
  const supabase = await createClient();
  const email = str(form, "email")?.toLowerCase();
  const role = str(form, "role");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back("/access", { error: { message: "Enter a valid email." } }, "");
  if (!role || !(role in ROLE_LABELS)) back("/access", { error: { message: "Pick a role." } }, "");
  const res = await supabase
    .from("allowed_users")
    .upsert({ email, role, name: str(form, "name"), added_by: me.email }, { onConflict: "email" });
  back("/access", res, `${email} can now sign in.`);
}

export async function setParentAccess(form: FormData) {
  await requireRole(ADMINS);
  const supabase = await createClient();
  const on = str(form, "on") === "1";
  const email = str(form, "email") ?? "";
  const res = await supabase.from("allowed_users").update({ can_see_parents: on }).eq("email", email);
  back("/access", res, on ? `${email} can now see parent contacts.` : `${email} can no longer see parent contacts.`);
}

export async function removeMember(form: FormData) {
  const me = await requireRole(ADMINS);
  const email = str(form, "email");
  if (email === me.email) back("/access", { error: { message: "You can't remove yourself." } }, "");
  const supabase = await createClient();
  const res = await supabase.from("allowed_users").delete().eq("email", email ?? "");
  back("/access", res, `${email} no longer has access.`);
}

// Parent contacts (CSV export of the Google Sheet) ---------------------------
export async function importParentContacts(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const file = form.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : str(form, "csv");
  if (!text) back("/emergency", { error: { message: "Choose the CSV file exported from the Google Sheet." } }, "");
  if (text.length > 2_000_000) back("/emergency", { error: { message: "That file is too large (2 MB max)." } }, "");
  const { rows, error } = parseParentCsv(text);
  if (error) back("/emergency", { error: { message: error } }, "");

  const supabase = await createClient();
  // Replace the whole list so the hub always mirrors the latest sheet.
  const del = await supabase.from("parent_contacts").delete().gte("id", 0);
  if (del.error) back("/emergency", del, "");
  const res = await supabase.from("parent_contacts").insert(rows);
  const early = rows.filter((r) => r.campus === "early-years").length;
  back("/emergency", res, `Imported ${rows.length} parent contacts (${early} Early Years, ${rows.length - early} Maiden Ln).`);
}

// Staff directory (Admins and Campus Coordinators) -----------------------------
const staffCampus = (f: FormData) => {
  const v = str(f, "campus");
  return v === "maiden-ln" || v === "early-years" || v === "all" ? v : "unassigned";
};

export async function saveStaff(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const supabase = await createClient();
  const id = num(form, "id");
  const row = {
    campus: staffCampus(form), name: str(form, "name") ?? "Unnamed", title: str(form, "title"), team: str(form, "team"),
    email: str(form, "email")?.toLowerCase() ?? null, phone: str(form, "phone"), notes: str(form, "notes"),
    sort: num(form, "sort") ?? 0, updated_at: new Date().toISOString(),
  };
  const res = id
    ? await supabase.from("staff_directory").update(row).eq("id", id)
    : await supabase.from("staff_directory").insert(row);
  back("/staff?edit=1", res, id ? "Staff member updated." : "Staff member added.");
}

export async function moveStaff(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const supabase = await createClient();
  const res = await supabase.from("staff_directory")
    .update({ campus: staffCampus(form), updated_at: new Date().toISOString() }).eq("id", num(form, "id") ?? -1);
  back("/staff?edit=1", res, "Moved.");
}

export async function deleteStaff(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const supabase = await createClient();
  const res = await supabase.from("staff_directory").delete().eq("id", num(form, "id") ?? -1);
  back("/staff?edit=1", res, "Staff member removed.");
}

export async function importStaff(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const file = form.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : null;
  if (!text) back("/staff?edit=1", { error: { message: "Choose the CSV file exported from the Google Sheet." } }, "");
  if (text.length > 2_000_000) back("/staff?edit=1", { error: { message: "That file is too large (2 MB max)." } }, "");
  const { rows, error } = parseStaffCsv(text);
  if (error) back("/staff?edit=1", { error: { message: error } }, "");
  const supabase = await createClient();
  // Replace the whole list so the directory mirrors the latest sheet.
  const del = await supabase.from("staff_directory").delete().gte("id", 0);
  if (del.error) back("/staff?edit=1", del, "");
  const res = await supabase.from("staff_directory").insert(rows);
  back("/staff", res, `Imported ${rows.length} staff.`);
}

// Resource library for the Ask assistant (Admins and Campus Coordinators) -----
export async function saveResource(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const supabase = await createClient();
  const id = num(form, "id");
  const body = str(form, "body") ?? "";
  if (body.length > 100_000) back("/resources", { error: { message: "That's too long for one resource (100,000 characters max). Split it up." } }, "");
  const row = { title: str(form, "title") ?? "Untitled", category: str(form, "category"), campus: scope(form), body, updated_at: new Date().toISOString() };
  const res = id
    ? await supabase.from("hub_resources").update(row).eq("id", id)
    : await supabase.from("hub_resources").insert(row);
  back("/resources", res, id ? "Resource updated." : "Resource added.");
}

export async function deleteResource(form: FormData) {
  await requireRole(STAFF_MANAGERS);
  const supabase = await createClient();
  const res = await supabase.from("hub_resources").delete().eq("id", num(form, "id") ?? -1);
  back("/resources", res, "Resource removed.");
}
