"use client";

import { useState } from "react";

// Mailing-list helper: opens one email with everyone in BCC (so nobody sees
// the other addresses), or copies the list to paste into Gmail / ParentSquare.
export function BulkEmail({ emails, label }: { emails: (string | null)[]; label: string }) {
  const list = [...new Set(emails.filter((e): e is string => !!e && e.includes("@")).map((e) => e.trim().toLowerCase()))];
  const [copied, setCopied] = useState(false);
  if (!list.length) return null;
  // Very long mailto links get cut off by some mail apps; past that, copy instead.
  const href = `mailto:?bcc=${list.map(encodeURIComponent).join(",")}`;
  const tooLong = href.length > 1900;

  async function copy() {
    try {
      await navigator.clipboard.writeText(list.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy these addresses:", list.join(", "));
    }
  }

  return (
    <span className="bulk-email">
      {!tooLong && (
        <a href={href} className="btn sm secondary" aria-label={`Email ${label} (${list.length}, BCC)`}>
          Email {label} ({list.length})
        </a>
      )}
      <button type="button" className="btn sm ghost" onClick={copy} aria-live="polite">
        {copied ? "Copied ✓" : `Copy ${list.length} email${list.length === 1 ? "" : "s"}`}
      </button>
    </span>
  );
}
