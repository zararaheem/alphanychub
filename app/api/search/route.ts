import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { search } from "@/lib/search";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { data: member } = await supabase.from("allowed_users").select("email").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!member) return NextResponse.json({ error: "You're not on the hub access list." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { q?: string } | null;
  const q = (body?.q ?? "").slice(0, 300);
  if (!q.trim()) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  return NextResponse.json({ results: await search(q) });
}
