"use client";

import { useState } from "react";

// Copies the weekly summary for pasting into Slack or an email.
export function CopyText({ text, label = "Copy summary" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn sm outline no-print" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
    }}>{done ? "Copied" : label}</button>
  );
}
