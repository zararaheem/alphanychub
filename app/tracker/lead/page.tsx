import { EDITORS, requireRole } from "@/lib/access";
import { LeadApp } from "@/components/early-years/lead-app";

export default async function TrackerLeadPage() {
  await requireRole(EDITORS);
  return <LeadApp />;
}
