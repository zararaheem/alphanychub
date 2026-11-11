import { redirect } from "next/navigation";

// The Lead Guide view is now the weekly report.
export default function TrackerLeadPage() {
  redirect("/tracker/report");
}
