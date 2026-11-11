import { requireMember } from "@/lib/access";
import { EyApp } from "@/components/ey/ey-app";

export default async function EyPage() {
  const me = await requireMember();
  return <EyApp me={me.name ?? me.email} />;
}
