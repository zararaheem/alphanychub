import { createClient } from "@/lib/supabase/server";
import type { Campus } from "@/lib/campus";
import type { Contact, Procedure, Trip, Workshop } from "@/lib/types";

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

export async function getTrips(campus: Campus | null, opts: { from?: string; to?: string } = {}) {
  const supabase = await createClient();
  let q = supabase.from("off_campus_trips").select("*").in("campus", scopes(campus));
  if (opts.from) q = q.gte("trip_date", opts.from);
  if (opts.to) q = q.lte("trip_date", opts.to);
  const { data } = await q.order("trip_date").order("depart_time", { nullsFirst: true });
  return (data ?? []) as Trip[];
}

export async function getWorkshops(campus: Campus | null, opts: { from?: string } = {}) {
  const supabase = await createClient();
  let q = supabase.from("workshops").select("*").in("campus", scopes(campus));
  if (opts.from) q = q.gte("day", opts.from);
  const { data } = await q.order("day").order("start_time", { nullsFirst: true });
  return (data ?? []) as Workshop[];
}
