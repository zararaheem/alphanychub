import { requireRole } from "@/lib/access";
import { LeadApp } from "@/components/early-years/lead-app";

export default async function LeadPage() {
  await requireRole(["admin", "lead"]);
  return <LeadApp />;
}
