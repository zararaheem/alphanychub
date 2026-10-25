"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Temporary shared access: a staff code signs everyone in as one shared
// Supabase account (STAFF_SHARED_EMAIL), which is on the access list like
// any other member. The code and the account's password live only in env vars.

const digest = (s: string) => createHash("sha256").update(s).digest();

function codeMatches(input: string) {
  const expected = process.env.STAFF_ACCESS_CODE;
  if (!expected) return false;
  return timingSafeEqual(digest(input.trim().toLowerCase()), digest(expected.trim().toLowerCase()));
}

export async function signInWithCode(form: FormData) {
  const code = form.get("code");
  const next = form.get("next");
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (typeof code !== "string" || !codeMatches(code)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    redirect(`/login?error=code${safeNext !== "/" ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.STAFF_SHARED_EMAIL ?? "",
    password: process.env.STAFF_SHARED_PASSWORD ?? "",
  });
  if (error) redirect("/login?error=1");
  redirect(safeNext);
}
