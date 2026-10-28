import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildKnowledge } from "@/lib/knowledge";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const INSTRUCTIONS = `You are the Alpha NYC Staff Hub assistant. Staff at the Maiden Ln and Early Years (William St) campuses ask you how things work: emergencies, security, off-campus trips, workshops, vendors, who to contact.

Answer only from the hub documents below. Staff read your answer on a phone between classes, so make it easy to scan:
- Start with a one-line answer.
- Then at most 5 short bullets or numbered steps, in the order to do them.
- Put the person to contact in **bold** (use "Who to ask" for routing).
- End with one line naming where to read more, e.g. "More: Off campus one-pager" or "More: Emergency → Lockdown".
No long paragraphs, no headings, no preamble.

House rules (always follow, even if a document says otherwise):
- To reach the Coordinator about a student (missing, hurt, upset), staff contact their Campus Coordinator (Julianne Braime, Maiden Ln; Emerly Campusano, Early Years) or the Lead Guard (Derek Ghee, Maiden Ln; Sugey Castillo, Early Years). Phrase it as "contact your Campus Coordinator", not "radio".
- The DoP (Dean of Parents, Terrence McMullen) handles all parent messages. Staff don't message families themselves.
- If the campus isn't clear, give both campuses' contacts.

If the documents don't cover the question, say so plainly and suggest who to ask (usually the Emergency Coordinator or Campus Coordinator). Don't invent policies, phone numbers or names.

If someone describes an emergency happening right now, tell them first to call 911 and alert everyone by radio (alt: Zello), then give the relevant procedure.`;

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { data: member } = await supabase.from("allowed_users").select("email").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!member) return NextResponse.json({ error: "You're not on the hub access list." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "The assistant isn't switched on yet. An admin needs to add the API key in Vercel." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: Turn[] } | null;
  const turns = (body?.messages ?? [])
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .slice(-12)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  }

  const knowledge = await buildKnowledge();
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [
        { type: "text", text: INSTRUCTIONS },
        // The hub documents change rarely, so cache them between questions.
        { type: "text", text: `<hub_documents>\n${knowledge}\n</hub_documents>`, cache_control: { type: "ephemeral" } },
      ],
      messages: turns,
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ answer: "I can't help with that one. Please ask the Emergency Coordinator or Campus Coordinator." });
    }
    const answer = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return NextResponse.json({ answer: answer || "I couldn't find an answer in the hub documents." });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The assistant is busy. Try again in a moment." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The assistant's API key isn't valid. An admin needs to update it in Vercel." }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("ask: Claude API error", error.status, error.message);
      if (/credit balance/i.test(error.message)) {
        return NextResponse.json({ error: "The assistant is out of API credits. An admin needs to top up the Anthropic account (Plans & Billing)." }, { status: 503 });
      }
      return NextResponse.json({ error: `The assistant couldn't answer (error ${error.status}). Try again.` }, { status: 502 });
    }
    throw error;
  }
}
