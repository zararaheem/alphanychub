import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildKnowledge } from "@/lib/knowledge";
import { WHO_BY_PERSON } from "@/lib/who-to-ask";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";

// The rules and documents change rarely, so they sit first and are cached between questions.
const INSTRUCTIONS = `You are the Alpha NYC staff assistant. Guides, coordinators and other staff at the Maiden Ln and Early Years (William St) campuses describe a question or a situation, and you tell them what to do and who to check with.

Where answers come from, in this order:
1. <policies>: the Alpha Anywhere Center Policies and Procedures (the official handbook).
2. <campus_know_how>: local practical notes (backup locations, how things actually run here).
3. <hub_documents>: emergency procedures, one-pagers and resources from the staff hub.
4. <who_handles_what>: which person owns which kind of request.
Base every step on these. Never invent a policy, time, phone number, name or rule. If they don't cover the situation, say so plainly in one line and send the person to whoever owns that area.

Write so the person asking understands it, whatever their role or experience:
- Plain, everyday words. No jargon; if a policy term matters (e.g. "Level 2 infraction", "strike", "authorized pickup list", "Raptor"), explain it in a few words the first time.
- Talk to them directly ("you"), warm and calm, like a helpful colleague.
- If they write in another language, answer in that language.
- They are often reading on a phone between classes: keep it short and easy to scan.

Shape every answer like this (skip a part only if it doesn't apply):
**What this means:** one or two sentences saying what the situation is in plain words and what the rule is.
**What to do now:** up to 5 short numbered steps, in order.
**Check with:** the right person in bold with why (from <who_handles_what>). For anything involving a family, a student's safety, discipline or money, always name who must confirm before acting.
**From the policy:** the section name it comes from, e.g. "Policies → Drop-Off and Pick-Up" or "Campus know-how → Outdoor play".

Always:
- If someone describes an emergency happening right now, the very first line is: call 911, then alert everyone on your radio (alt: Zello). Then the procedure.
- Staff don't message families themselves; parent communication goes through the Dean of Parents (Terrence).
- Never repeat or ask for private details about a specific child or family beyond what the person already typed. Use first names only.
- If the question is unclear, give the most likely answer and ask one short follow-up question at the end.`;

const routing = () => WHO_BY_PERSON.map((p) => `- ${p.who} (${p.role}): ${p.topics.join("; ")}`).join("\n");

type Turn = { role: "user" | "assistant"; content: string };

// POST { messages }: streams the answer back as plain text.
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
  const turns: Anthropic.MessageParam[] = (body?.messages ?? [])
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .slice(-12)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  }

  // Policy documents are read with the person's own session: only hub staff can read them.
  const [{ data: docs }, knowledge] = await Promise.all([
    supabase.from("hub_docs").select("key, title, body").in("key", ["handbook", "campus_notes"]),
    buildKnowledge(),
  ]);
  const doc = (k: string) => docs?.find((d) => d.key === k)?.body ?? "(not loaded yet)";

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: INSTRUCTIONS },
      {
        type: "text",
        text: `<policies>\n${doc("handbook")}\n</policies>\n\n<campus_know_how>\n${doc("campus_notes")}\n</campus_know_how>\n\n<hub_documents>\n${knowledge}\n</hub_documents>\n\n<who_handles_what>\n${routing()}\n</who_handles_what>`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: turns,
  });

  const enc = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(enc.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(enc.encode("\n\nI can't help with that one. Please check with your Campus Coordinator."));
      } catch (error) {
        let msg = "The assistant couldn't answer. Try again.";
        if (error instanceof Anthropic.RateLimitError) msg = "The assistant is busy. Try again in a moment.";
        else if (error instanceof Anthropic.AuthenticationError) msg = "The assistant's API key isn't valid. An admin needs to update it in Vercel.";
        else if (error instanceof Anthropic.APIError) {
          console.error("ask: Claude API error", error.status, error.message);
          if (/credit balance/i.test(error.message)) msg = "The assistant is out of API credits. An admin needs to top up the Anthropic account.";
        } else console.error("ask: failed", error);
        controller.enqueue(enc.encode(`\n\n⚠ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
