import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const OLD_HOSTS = ["alpha-nyc-staff-hub.vercel.app"];
const HOME = "nychub.vercel.app";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Old links keep working: send them to the same page on nychub.vercel.app.
  if (OLD_HOSTS.includes(request.headers.get("host") ?? "")) {
    return NextResponse.redirect(`https://${HOME}${url.pathname}${url.search}`, 308);
  }
  // If Supabase sends a Google sign-in back to the site root, finish it at the callback.
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const to = url.clone();
    to.pathname = "/auth/callback";
    return NextResponse.redirect(to);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
