import { NextResponse } from "next/server";
import { THEME_COOKIE } from "@/lib/theme";

// GET /theme?set=light&next=/staff: remembers the light/dark choice.
export function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, url.origin), { status: 303 });
  if (url.searchParams.get("set") === "light") {
    res.cookies.set(THEME_COOKIE, "light", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else res.cookies.delete(THEME_COOKIE);
  return res;
}
