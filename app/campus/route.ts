import { NextResponse } from "next/server";
import { parseCampus } from "@/lib/campus";
import { CAMPUS_COOKIE } from "@/lib/campus-pref";

// GET /campus?set=early-years&next=/emergency: remembers the campus toggle.
export function GET(request: Request) {
  const url = new URL(request.url);
  const campus = parseCampus(url.searchParams.get("set") ?? undefined);
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, url.origin), { status: 303 });
  if (campus) res.cookies.set(CAMPUS_COOKIE, campus, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  else res.cookies.delete(CAMPUS_COOKIE);
  return res;
}
