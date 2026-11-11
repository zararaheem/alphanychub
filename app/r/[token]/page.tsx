import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { Brand } from "@/components/brand";
import { PrintButton } from "@/components/print-button";
import { ParentReportView } from "@/components/early-years/parent-report";
import { fromShare, type SharePayload } from "@/lib/parent-report";
import { unlockReport } from "./actions";

export const metadata: Metadata = { title: "Weekly report · Alpha Wonder Lab", robots: { index: false, follow: false } };

// A family's weekly report, behind the password their guide sent them.
export default async function SharedReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-f-]{36}$/.test(token);
  const password = (await cookies()).get(`rp_${token}`)?.value;
  let payload: SharePayload | null = null;
  let error = "";
  if (valid && password) {
    const db = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await db.rpc("ey_open_share", { p_token: token, p_password: password });
    const res = data as (SharePayload & { error?: string }) | null;
    if (res?.error) error = res.error; else if (res) payload = res;
  }
  if (!valid) error = "gone";

  if (payload) {
    return (
      <main className="wrap stack mw-report pr-shared">
        <div className="row no-print" style={{ justifyContent: "space-between" }}>
          <Brand />
          <PrintButton label="Print or save PDF" />
        </div>
        <ParentReportView r={fromShare(payload)} readOnly />
      </main>
    );
  }

  return (
    <div className="tl">
      <span className="brand tl-brand"><Brand size={40} /></span>
      <div className="tl-card">
        <span className="kicker">Wonder Lab · Family report</span>
        <h1>Your child&apos;s weekly report</h1>
        {error === "gone" ? (
          <p>This link has expired or was turned off. Ask your child&apos;s guide for a new one.</p>
        ) : error === "locked" ? (
          <p>This link is locked after too many tries. Ask your child&apos;s guide for a new one.</p>
        ) : (
          <form action={unlockReport} className="stack">
            <input type="hidden" name="token" value={token} />
            <p className="muted">Enter the password your child&apos;s guide sent you. It looks like <b>Lastname-1234</b>.</p>
            {error === "password" && <p className="notice error" role="alert">That password didn&apos;t match. Check it and try again.</p>}
            <input name="password" className="input" required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Lastname-1234" aria-label="Password" />
            <button type="submit" className="btn">Open report</button>
          </form>
        )}
      </div>
    </div>
  );
}
