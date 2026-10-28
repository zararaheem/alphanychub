import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Campus } from "@/lib/requests";

// Parent Hub sign-in: a family types the email on the parent roster, gets a
// 6-digit code by email, and stays signed in for 30 days (signed cookie).
// Vercel env: SUPABASE_SERVICE_ROLE_KEY, PARENT_HUB_SECRET, RESEND_API_KEY, PARENT_HUB_EMAIL_FROM.
const COOKIE = "parent_hub";
const DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const secret = () => process.env.PARENT_HUB_SECRET || process.env.PARENT_UNLOCK_SECRET || "";
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");
const hashCode = (email: string, code: string) => createHash("sha256").update(`${secret()}:${email}:${code}`).digest("hex");

export type Child = { student: string; grade: string | null; campus: Campus };
export type Family = { email: string; name: string | null; children: Child[]; preview: boolean };

export const parentHubReady = () => !!(process.env.SUPABASE_SERVICE_ROLE_KEY && secret());
export const emailReady = () => !!(process.env.RESEND_API_KEY && process.env.PARENT_HUB_EMAIL_FROM);

const normalize = (email: string) => email.trim().toLowerCase();

async function familyFor(email: string): Promise<Omit<Family, "preview"> | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("parent_contacts").select("student, grade, campus, guardian").eq("email", email).order("student");
  if (!data?.length) return null;
  const seen = new Set<string>();
  const children = data.flatMap((r) => (seen.has(r.student) ? [] : (seen.add(r.student), [{ student: r.student, grade: r.grade, campus: r.campus as Campus }])));
  return { email, name: data.find((r) => r.guardian)?.guardian ?? null, children };
}

// Always reports "sent" for unknown emails so the form can't be used to test who's on the roster.
export async function sendCode(rawEmail: string): Promise<"sent" | "wait" | "not-ready"> {
  const email = normalize(rawEmail);
  const admin = createAdminClient();
  if (!admin || !emailReady() || !secret()) return "not-ready";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "sent";

  const { data: prev } = await admin.from("parent_hub_codes").select("sent_at").eq("email", email).maybeSingle();
  if (prev && Date.now() - new Date(prev.sent_at).getTime() < 60_000) return "wait";
  const { count } = await admin.from("parent_contacts").select("id", { count: "exact", head: true }).eq("email", email);
  if (!count) return "sent";

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await admin.from("parent_hub_codes").upsert({
    email, code_hash: hashCode(email, code), attempts: 0,
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(), sent_at: new Date().toISOString(),
  });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.PARENT_HUB_EMAIL_FROM, to: email,
      subject: `Your Alpha NYC Parent Hub code: ${code}`,
      text: `Your sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
    }),
  });
  if (!res.ok) console.error("parent hub: email send failed", res.status);
  return "sent";
}

export async function verifyCode(rawEmail: string, rawCode: string): Promise<boolean> {
  const email = normalize(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const admin = createAdminClient();
  if (!admin || code.length !== 6) return false;
  const { data } = await admin.from("parent_hub_codes").select("*").eq("email", email).maybeSingle();
  if (!data || data.attempts >= MAX_ATTEMPTS || new Date(data.expires_at).getTime() < Date.now()) return false;
  const a = Buffer.from(hashCode(email, code));
  const b = Buffer.from(data.code_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await admin.from("parent_hub_codes").update({ attempts: data.attempts + 1 }).eq("email", email);
    return false;
  }
  await admin.from("parent_hub_codes").delete().eq("email", email);
  const exp = Date.now() + DAYS * 86_400_000;
  const value = `${Buffer.from(email).toString("base64url")}.${exp}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/parents", maxAge: DAYS * 86_400,
  });
  return true;
}

export async function signOutParent() {
  (await cookies()).delete({ name: COOKIE, path: "/parents" });
}

async function signedInEmail(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !secret()) return null;
  const i = raw.lastIndexOf(".");
  const value = raw.slice(0, i);
  const a = Buffer.from(raw.slice(i + 1));
  const b = Buffer.from(sign(value));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [email64, exp] = value.split(".");
  if (Number(exp) < Date.now()) return null;
  return Buffer.from(email64, "base64url").toString();
}

// The signed-in family, or a staff preview for anyone signed into the staff hub.
export async function currentFamily(): Promise<Family | null> {
  const email = await signedInEmail();
  if (email) {
    const fam = await familyFor(email);
    if (fam) return { ...fam, preview: false };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: member } = await supabase.from("allowed_users").select("email, name").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!member) return null;
  return {
    email: member.email, name: member.name ?? "Staff preview", preview: true,
    children: [
      { student: "Preview student (Maiden Ln)", grade: null, campus: "maiden-ln" },
      { student: "Preview student (Early Years)", grade: null, campus: "early-years" },
    ],
  };
}
