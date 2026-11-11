import { createClient } from "@/lib/supabase/server";
import type { Campus } from "@/lib/requests";

// Parent Hub sign-in: families sign in with Google, and the email Google gives
// us must match the parent roster. Their children come from public.my_children(),
// which only ever returns rows for the signed-in email.

export type Child = { student: string; grade: string | null; campus: Campus };
export type Family = { email: string; name: string | null; children: Child[]; preview: boolean };

export async function signedInEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

// The signed-in family, or a staff preview for anyone on the staff hub access list.
export async function currentFamily(): Promise<Family | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) return null;

  const { data: rows } = await supabase.rpc("my_children");
  const kids = (rows ?? []) as { student: string; grade: string | null; campus: Campus; guardian: string | null }[];
  if (kids.length) {
    const seen = new Set<string>();
    const children = kids.flatMap((r) => (seen.has(r.student) ? [] : (seen.add(r.student), [{ student: r.student, grade: r.grade, campus: r.campus }])));
    const name = kids.find((r) => r.guardian)?.guardian ?? (user?.user_metadata?.full_name as string | undefined) ?? null;
    return { email, name, children, preview: false };
  }

  const { data: member } = await supabase.from("allowed_users").select("email, name").eq("email", email).maybeSingle();
  if (!member) return null;
  return {
    email, name: member.name ?? "Staff preview", preview: true,
    children: [
      { student: "Preview student (Maiden Ln)", grade: null, campus: "maiden-ln" },
      { student: "Preview student (Early Years)", grade: null, campus: "early-years" },
    ],
  };
}
