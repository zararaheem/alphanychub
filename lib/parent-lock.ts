import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Member } from "@/lib/access";

// Parent contacts stay hidden until the viewer enters their personal code.
// Codes live in Vercel env vars, never in the repo:
//   PARENT_UNLOCK_CODES   JSON {"email": "code"} for people with their own code
//   PARENT_UNLOCK_SUFFIX  everyone else's code is <last name><suffix>
//   PARENT_UNLOCK_SECRET  signs the unlock cookie
const COOKIE = "hub_parents";
const MINUTES = 30;

function overrides(): Record<string, string> {
  try {
    return JSON.parse(process.env.PARENT_UNLOCK_CODES ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

// Last name from first.last@… (falls back to the last word of their name).
function lastName(m: Member) {
  const parts = m.email.split("@")[0].split(".").filter(Boolean);
  const fromEmail = parts.length > 1 ? parts[parts.length - 1] : null;
  return (fromEmail ?? m.name?.trim().split(/\s+/).pop() ?? "").toLowerCase().replace(/[^a-z-]/g, "");
}

export function expectedCode(m: Member): string | null {
  const own = overrides()[m.email.toLowerCase()];
  if (own) return own.toLowerCase();
  const suffix = process.env.PARENT_UNLOCK_SUFFIX;
  const last = lastName(m);
  return suffix && last ? `${last}${suffix}`.toLowerCase() : null;
}

export function codeMatches(m: Member, code: string) {
  const want = expectedCode(m);
  if (!want) return false;
  const a = Buffer.from(code.trim().toLowerCase());
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sign = (value: string) => createHmac("sha256", process.env.PARENT_UNLOCK_SECRET ?? "").update(value).digest("hex");

export async function setUnlocked(m: Member) {
  const until = Date.now() + MINUTES * 60_000;
  const value = `${until}.${sign(`${m.email}|${until}`)}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MINUTES * 60 });
}

export async function clearUnlocked() {
  (await cookies()).delete(COOKIE);
}

export async function isUnlocked(m: Member) {
  if (!process.env.PARENT_UNLOCK_SECRET) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [until, mac] = raw.split(".");
  if (!until || !mac || Number(until) < Date.now()) return false;
  const want = Buffer.from(sign(`${m.email}|${until}`));
  const got = Buffer.from(mac);
  return want.length === got.length && timingSafeEqual(want, got);
}

export const UNLOCK_MINUTES = MINUTES;
