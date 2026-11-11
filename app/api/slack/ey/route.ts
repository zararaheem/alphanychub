import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { nyDate, parseMessage } from "@/lib/ey";
import { HELP, applyUpdate, eyRoster, summary } from "@/lib/ey-server";

// Slack slash command /ey: staff type a message (or paste a parent's WhatsApp)
// and it updates Early Years arrivals and dismissal. Slack signs every request
// with the app's signing secret; anything unsigned is refused.

function verified(raw: string, ts: string | null, sig: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const mine = `v0=${createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex")}`;
  const a = Buffer.from(mine);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

const reply = (text: string, inChannel = false) =>
  NextResponse.json({ response_type: inChannel ? "in_channel" : "ephemeral", text });

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verified(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature")))
    return new NextResponse("bad signature", { status: 401 });

  const form = new URLSearchParams(raw);
  const text = form.get("text") ?? "";
  const by = `@${form.get("user_name") ?? "slack"} (Slack)`;

  try {
    const today = nyDate();
    const roster = await eyRoster(today);
    const parsed = parseMessage(text, roster, today);
    if (parsed.kind === "help") return reply(HELP);
    if (parsed.kind === "error") return reply(`${parsed.message}\nType \`/ey help\` for examples.`);
    if (parsed.kind === "list") return reply(summary(parsed.day === today ? roster : await eyRoster(parsed.day), parsed.day));
    const forDay = parsed.day && parsed.day !== today ? await eyRoster(parsed.day) : roster;
    const line = await applyUpdate(parsed, forDay, by);
    // Everyone in the channel sees the change, with the original message underneath.
    return reply(`${line}\n> ${text.replace(/\n/g, "\n> ")}\n_by ${by.replace(" (Slack)", "")} · <${hub()}/ey|Open EY attendance>_`, true);
  } catch (e) {
    console.error("ey slack command failed", e);
    return reply("Sorry, that didn't save. Try again, or update it in the app.");
  }
}

function hub() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
}
