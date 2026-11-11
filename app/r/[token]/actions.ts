"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Remembers the password for this one link on this device, so a refresh
// doesn't ask again. The page checks it against the database every time.
export async function unlockReport(form: FormData) {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "").trim().slice(0, 80);
  if (!/^[0-9a-f-]{36}$/.test(token)) redirect("/");
  (await cookies()).set(`rp_${token}`, password, { httpOnly: true, secure: true, sameSite: "lax", path: `/r/${token}`, maxAge: 60 * 60 * 12 });
  redirect(`/r/${token}`);
}
