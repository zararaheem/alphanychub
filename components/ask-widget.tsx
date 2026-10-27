"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AskChat } from "@/components/ask-chat";

// Floating "Ask" bubble on every hub page; opens the assistant in a panel.
export function AskWidget() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (path === "/ask") return null;

  return (
    <div className="ask-widget no-print">
      {open && (
        <section className="ask-panel" role="dialog" aria-label="Ask the hub">
          <header className="ask-panel-head">
            <span className="row" style={{ gap: 8 }}>
              <Spark />
              <b>Ask the hub</b>
            </span>
            <span className="row" style={{ gap: 4 }}>
              <Link href="/ask" className="btn ghost sm" onClick={() => setOpen(false)}>Full page</Link>
              <button type="button" className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </span>
          </header>
          <div className="ask-panel-body">
            <p className="small muted">Searches the hub<p className="small muted">Answers from the hub&apos;s procedures, one-pagers and resources. Emergency now? Call 911 first.</p>apos;s procedures, one-pagers, checklist, resources and tools. Emergency now? Call 911 first.</p>
            <AskChat compact />
          </div>
        </section>
      )}
      <button type="button" className="ask-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close Ask the hub" : "Search the hub"}>
        {open ? <span aria-hidden="true" style={{ fontSize: 18 }}>✕</span> : <><Spark /><span>Ask</span></>}
      </button>
    </div>
  );
}

const Spark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 7l.9 2.1L15 10l-2.1.9L12 13l-.9-2.1L9 10l2.1-.9z" fill="currentColor" stroke="none" />
  </svg>
);
