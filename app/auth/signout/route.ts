import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // The Early Years Tracker is its own site: signing out there goes back to its sign-in.
  const to = new URL(request.url).searchParams.get("to") === "tracker" ? "/login?next=%2Fey-tracker" : "/login";
  return NextResponse.redirect(new URL(to, request.url), { status: 303 });
}
