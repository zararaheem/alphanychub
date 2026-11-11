import { isAdmin, isTrackerOwner, requireTracker } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { WorkApp } from "@/components/early-years/work-app";
import type { Person } from "@/components/early-years/tracker-admin";

export default async function TrackerPage() {
  const me = await requireTracker();
  const admin = isAdmin(me.role);
  const owner = await isTrackerOwner();
  let people: Person[] = [];
  if (owner) {
    const { data } = await (await createClient()).from("allowed_users").select("email, name, role, tracker, ey_class").order("name");
    people = (data ?? []) as Person[];
  }
  return <WorkApp me={me.name ?? me.email} admin={admin} owner={owner} people={people} myClass={me.ey_class} />;
}
