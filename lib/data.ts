import { createClient } from "@/lib/supabase/server";
import type { Campus } from "@/lib/campus";
import type { Contact, ParentContact, Procedure, StaffMember, Workshop } from "@/lib/types";

// campus=null → everything; otherwise that campus plus rows marked "all".
const scopes = (c: Campus | null) => (c ? [c, "all"] : ["maiden-ln", "early-years", "all"]);

export async function getContacts(campus: Campus | null) {
  const supabase = await createClient();
  const { data } = await supabase.from("emergency_contacts").select("*").in("campus", scopes(campus))
    .order("sort").order("name");
  return (data ?? []) as Contact[];
}

export async function getProcedures(campus: Campus | null) {
  const supabase = await createClient();
  const { data } = await supabase.from("emergency_procedures").select("*").in("campus", scopes(campus))
    .order("sort").order("title");
  return (data ?? []) as Procedure[];
}

export async function getWorkshops(campus: Campus | null, opts: { from?: string } = {}) {
  const supabase = await createClient();
  let q = supabase.from("workshops").select("*").in("campus", scopes(campus));
  if (opts.from) q = q.gte("day", opts.from);
  const { data } = await q.order("day").order("start_time", { nullsFirst: true });
  return (data ?? []) as Workshop[];
}

export async function getParentContacts(campus: Campus | null) {
  const supabase = await createClient();
  let q = supabase.from("parent_contacts").select("*");
  if (campus) q = q.eq("campus", campus);
  const { data } = await q.order("sort").order("student").order("id");
  return (data ?? []) as ParentContact[];
}

export async function getStaff(campus: Campus | null) {
  const supabase = await createClient();
  const { data } = await supabase.from("staff_directory").select("*").in("campus", scopes(campus))
    .order("sort").order("name");
  return (data ?? []) as StaffMember[];
}
