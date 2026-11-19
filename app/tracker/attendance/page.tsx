import { requireTracker } from "@/lib/access";
import { EyApp } from "@/components/ey/ey-app";

// Arrivals and dismissal inside the tracker, so guides use one site and one sign-in.
export default async function TrackerAttendance() {
  const me = await requireTracker();
  return <EyApp me={me.name ?? me.email} />;
}
