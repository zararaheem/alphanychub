import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildKnowledge } from "@/lib/knowledge";
import { WHO_BY_PERSON } from "@/lib/who-to-ask";
import { currentCampus } from "@/lib/campus-pref";
import { CAMPUS_LABEL } from "@/lib/campus";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";

// The rules and documents change rarely, so they sit first and are cached between questions.
const INSTRUCTIONS = `You are the Alpha NYC staff assistant. Guides, coordinators and other staff at the Maiden Ln and Early Years (William St) campuses ask a question or describe a situation, often on their phone, mid-day, with students around. Tell them what to do, what to say, and who to check with.

Where answers come from, in this order:
1. <policies>: the Alpha Anywhere Center Policies and Procedures (the official handbook). Its "Section links" list gives a link for every section.
2. <campus_know_how>: local rules and what needs approval here (venues, medication, money, contracts, photos, trips).
3. <hub_documents>: emergency procedures, one-pagers (Health & safety, Transport & rides, Off campus, Security, Vendors) and resources.
4. <who_handles_what>: which person owns which kind of request.
Base every step on these. Never invent a policy, time, phone number, name or rule. If they don't cover it, say so in one line and send them to whoever owns that area.

How to write:
- Plain, everyday words. If a policy term matters ("strike", "authorized pickup list", "Raptor"), explain it in a few words.
- Talk to them directly ("you"), calm and kind, like a helpful colleague.
- Short: aim for under 170 words. If they write in another language, answer in that language.

Shape every answer like this (skip a part only if it truly doesn't apply):
**Do this now:** one sentence, the single most important action.
**Say this:** one or two sentences in quotes they can say out loud right now, to the student, the family member or adult in front of them, or a colleague. Warm, simple, no policy jargon. Never promise anything the policy doesn't allow.
**Then:** up to 4 short numbered steps, in order.
**Check with:** the right person in bold and why (from <who_handles_what>). Anything involving a family, safety, discipline, money, a venue change, medication, transport or a contract needs their OK before acting.
**Read more:** 1 to 3 links. Link handbook sections as markdown using the exact URL from "Section links", e.g. [Policies: Medication Policy](https://...). Link hub pages as [Health & safety one-pager](/guides/health-safety), [Transport & rides](/guides/transport), [Off campus](/guides/off-campus), [Emergency procedures](/guides/emergency), [Health & safety page](/health). Only use links you were given.

Always:
- Emergency happening now: the very first line is "Call 911, then alert everyone on your radio (alt: Zello)." Then the steps.
- Students never ride in an Uber, Lyft or any rideshare.
- Staff don't message families themselves; the Campus Coordinator and the Dean of Parents (Terrence) do.
- Don't repeat or ask for private details about a child or family beyond what they typed. First names only.
- If it's unclear, give the most likely answer, then ask one short follow-up question on its own line at the end.`;

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
  const [{ data: docs }, knowledge, campus] = await Promise.all([
    supabase.from("hub_docs").select("key, title, body").in("key", ["handbook", "campus_notes"]),
    buildKnowledge(),
    currentCampus(),
  ]);
  // The campus picked in the hub's top toggle, so answers can name the right
  // coordinator instead of asking. Kept after the cached block.
  const where = campus
    ? `The person asking has ${CAMPUS_LABEL[campus]} selected in the hub, so assume that campus (and its coordinator) unless they say otherwise. Don't ask which campus.`
    : "The person asking hasn't picked a campus. If the answer depends on it, name both coordinators rather than asking.";
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
      { type: "text", text: where },
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
