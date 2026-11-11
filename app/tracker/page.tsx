import { requireTracker } from "@/lib/access";
import { WorkApp } from "@/components/early-years/work-app";

export default async function TrackerPage() {
  const me = await requireTracker();
  return <WorkApp me={me.name ?? me.email} />;
}
