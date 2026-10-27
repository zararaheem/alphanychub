import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "coordinator" | "lead" | "guide" | "staff";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  coordinator: "Campus Coordinator",
  lead: "Lead Guide",
  guide: "Guide",
  staff: "Staff",
};

export type Member = { email: string; role: Role; name: string | null; can_see_parents: boolean };

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
    .select("email, role, name, can_see_parents")
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

// Campus Coordinators can do everything Admins can except manage the access list.
export const ADMINS: Role[] = ["admin"];
export const EDITORS: Role[] = ["admin", "coordinator", "lead"];
// Adding, editing and moving people in the staff directory.
export const STAFF_MANAGERS: Role[] = ["admin", "coordinator"];
export const isAdmin = (role: Role) => ADMINS.includes(role);
export const canManageStaff = (role: Role) => STAFF_MANAGERS.includes(role);
// Parent contacts: Admins, Campus Coordinators, and anyone an admin has approved.
export const canSeeParents = (m: Member) => STAFF_MANAGERS.includes(m.role) || m.can_see_parents;
export const canEdit = (role: Role) => EDITORS.includes(role);
export const canSeeLead = canEdit;
