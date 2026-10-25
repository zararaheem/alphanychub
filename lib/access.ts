import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "lead" | "guide" | "staff";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  lead: "Lead Guide",
  guide: "Guide",
  staff: "Staff",
};

export type Member = { email: string; role: Role; name: string | null };

// Returns the signed-in member, or redirects: no session → /login,
// signed in but not on the access list → /no-access.
export async function requireMember(): Promise<Member> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data } = await supabase
    .from("allowed_users")
    .select("email, role, name")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (!data) redirect("/no-access");
  return { ...(data as Member), name: data.name ?? (user.user_metadata?.full_name as string | undefined) ?? null };
}

export async function requireRole(roles: Role[]): Promise<Member> {
  const member = await requireMember();
  if (!roles.includes(member.role)) redirect("/early-years");
  return member;
}

export const canSeeLead = (role: Role) => role === "admin" || role === "lead";
