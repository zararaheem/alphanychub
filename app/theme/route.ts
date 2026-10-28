import { NextResponse } from "next/server";
import { THEME_COOKIE } from "@/lib/theme";

// GET /theme?set=light&next=/staff: remembers the light/dark choice.
export function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(safeNext, url.origin), { status: 303 });
  const theme = url.searchParams.get("set") === "dark" ? "dark" : "light";
  res.cookies.set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
