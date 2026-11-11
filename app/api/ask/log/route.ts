import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logs each question asked in the hub assistant (and later a 👍/👎), so admins
// can see on /requests what staff look for and where the hub falls short.
// RLS only lets hub members write rows under their own email.
const NOT_COVERED = /(don't|do not|doesn't|does not) (cover|mention|include|say)|isn't (covered|in the hub)|couldn't find|no (information|details) (on|about)|not (in|covered by) the hub/i;

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, email: user?.email?.toLowerCase() ?? null };
}

export async function POST(request: Request) {
  const { supabase, email } = await me();
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { q?: string; answer?: string | null; hits?: number } | null;
  const question = body?.q?.trim().slice(0, 500);
  if (!question) return NextResponse.json({ error: "No question." }, { status: 400 });
  const answer = body?.answer?.slice(0, 4000) ?? null;
  const answered = answer ? !NOT_COVERED.test(answer) : (body?.hits ?? 0) > 0;
  const { data, error } = await supabase.from("ask_log").insert({ email, question, answer, answered }).select("id").single();
  if (error) return NextResponse.json({ id: null });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: Request) {
  const { supabase, email } = await me();
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: number; helpful?: boolean } | null;
  if (typeof body?.id !== "number" || typeof body.helpful !== "boolean") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  await supabase.from("ask_log").update({ helpful: body.helpful }).eq("id", body.id).eq("email", email);
  return NextResponse.json({ ok: true });
}
