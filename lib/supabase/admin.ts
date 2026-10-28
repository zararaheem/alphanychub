import { createClient } from "@supabase/supabase-js";

// Server-only client for the Parent Hub, which has no Supabase sign-in.
// Bypasses RLS, so every query must be scoped to the signed-in family.
// Needs SUPABASE_SERVICE_ROLE_KEY in Vercel (never NEXT_PUBLIC_).
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
