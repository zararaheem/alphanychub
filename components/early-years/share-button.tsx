"use client";

import { useState } from "react";
import { shareReport } from "@/app/tracker/actions";

// Makes a password-protected link to this report for the family.
export function ShareButton({ studentId, monday, name }: { studentId: number; monday: string; name: string }) {
  const [out, setOut] = useState<{ url: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = out ? `Here is ${name}'s weekly report from Wonder Lab: ${out.url}\nPassword: ${out.password}` : "";
  return (
    <div className="no-print stack-sm">
      {!out ? (
        <button type="button" className="btn sm" disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await shareReport(studentId, monday);
          setBusy(false);
          if (r.ok && r.url && r.password) setOut({ url: r.url, password: r.password }); else alert(r.error ?? "Couldn't make the link.");
        }}>{busy ? "Making link…" : "Share with family"}</button>
      ) : (
        <div className="card stack-sm mw-share">
          <span className="label">Password-protected link</span>
          <code>{out.url}</code>
          <span>Password: <b>{out.password}</b></span>
          <span className="small muted">Send the link and the password to the family (ideally separately). It works for 60 days; 10 wrong passwords lock it. Photos stay private to staff.</span>
          <button type="button" className="btn sm outline" style={{ width: "fit-content" }} onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch {} }}>{copied ? "Copied" : "Copy message"}</button>
        </div>
      )}
    </div>
  );
}
