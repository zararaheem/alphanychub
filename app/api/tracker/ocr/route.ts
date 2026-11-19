import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { canUseTracker, requireMember } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const INSTRUCTIONS = `You transcribe photos of young children's (ages 3–6) Montessori work for their guide's records.

Write out exactly what the child wrote or built, in reading order: letters, words, numerals, sums, labels. Keep the child's spelling, including invented spelling, and mark anything you can't read as [?]. If letters are reversed or mirrored, write the intended letter and add "(reversed)" after it.

Then, on a new line starting "Notes:", add one short sentence only if something about the work matters to a guide (e.g. "Letters traced over dotted lines", "Numerals 1–10 in order, 7 missing"). Leave the notes line out otherwise.

If there is no writing or numbers in the photo, reply exactly: No writing found.
Reply with the transcription only: no preamble.`;

const TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp"> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// POST { path }: reads a photo from the private ey-work bucket and returns the
// writing in it. The photo is read with the guide's own session, so storage
// rules decide who can use this.
export async function POST(request: Request) {
  const me = await requireMember();
  if (!canUseTracker(me)) return NextResponse.json({ error: "You're not approved for the tracker." }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Text reading isn't switched on yet (missing API key)." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path ?? "";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (!/^[\w\-/]+\.\w+$/.test(path) || !TYPES[ext]) return NextResponse.json({ error: "That file can't be read." }, { status: 400 });

  const supabase = await createClient();
  const { data: file, error } = await supabase.storage.from("ey-work").download(path);
  if (error || !file) return NextResponse.json({ error: "Couldn't open that photo." }, { status: 404 });
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSTRUCTIONS,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: TYPES[ext], data } },
          { type: "text", text: "Transcribe this child's work." },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ error: "Couldn't read this one. Type it in instead." }, { status: 422 });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return NextResponse.json({ text: text || "No writing found." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Busy. Try again in a moment." }, { status: 429 });
    if (e instanceof Anthropic.APIError) {
      console.error("tracker ocr: Claude API error", e.status, e.message);
      return NextResponse.json({ error: `Couldn't read the photo (error ${e.status}).` }, { status: 502 });
    }
    throw e;
  }
}
