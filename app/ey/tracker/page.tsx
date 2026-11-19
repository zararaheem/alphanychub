import { redirect } from "next/navigation";

// Also reachable as nychub.vercel.app/ey/tracker
export default function EyTrackerAlias() {
  redirect("/tracker");
}
