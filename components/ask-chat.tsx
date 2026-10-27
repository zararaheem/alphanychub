"use client";

import { useEffect, useRef, useState } from "react";
import { WHO_TO_ASK } from "@/lib/who-to-ask";

type Hit = { title: string; where: string; href?: string; external?: boolean; lines: string[] };
type Turn = { q: string; results: Hit[] };

const STARTERS = [
  "What do I do in a lockdown?",
  "Visitor at the door",
  "Student is missing",
  "Taking students off campus",
  "Vendor contract",
  "Student medication",
];

// Keyword search over the hub (no AI, no API costs). Each question shows the
// best-matching procedures, one-pager sections, checklist items and tools.
export function AskChat({ compact = false }: { compact?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  // Braces matter: newer browsers return a Promise from scrollIntoView, and React
  // would treat a returned value as the effect's cleanup function.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
      const data = (await res.json().catch(() => ({}))) as { results?: Hit[]; error?: string };
      if (!res.ok || !data.results) throw new Error(data.error ?? "Something went wrong. Try again.");
      setTurns((t) => [...t, { q, results: data.results! }].slice(-6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask">
      <div className="ask-log" aria-live="polite">
        {turns.length === 0 && (
          <div className="stack-sm">
            <details className="who-mini">
              <summary>Who do I ask? (quick list)</summary>
              <ul className="who-ask compact">
                {WHO_TO_ASK.map((r) => <li key={r.topic}><span>{r.topic}</span><b>{r.who}</b></li>)}
              </ul>
            </details>
            <p className="muted">Search the hub. Try one of these, or type a few words:</p>
            <div className="row" style={{ gap: 6 }}>
              {(compact ? STARTERS.slice(0, 4) : STARTERS).map((s) => (
                <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="stack-sm">
            <div className="bubble user"><span className="sr-only">You searched:</span>{t.q}</div>
            {t.results.length === 0 ? (
              <div className="bubble assistant">
                <p>Nothing in the hub matches that yet. Try different words (e.g. &ldquo;fire&rdquo;, &ldquo;visitor&rdquo;, &ldquo;bus&rdquo;), or check <b>Who do I ask?</b> above.</p>
              </div>
            ) : (
              <ul className="search-hits" aria-label={`Results for ${t.q}`}>
                {t.results.map((h, j) => (
                  <li key={j} className={`search-hit${j === 0 ? " top" : ""}`}>
                    <div className="between" style={{ alignItems: "baseline", gap: 8 }}>
                      {h.href ? (
                        <a href={h.href} className="hit-title" {...(h.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                          {h.title}{h.external ? " ↗" : " →"}
                        </a>
                      ) : <b className="hit-title">{h.title}</b>}
                      <span className="hit-where">{h.where}</span>
                    </div>
                    {h.lines.length > 0 && (
                      <ul className="hit-lines">{h.lines.map((l, k) => <li key={k}>{bold(l)}</li>)}</ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">Searching the hub…</div>}
        <div ref={end} />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask-input" className="sr-only">Search the hub</label>
        <input
          id="ask-input" className="input" value={draft} placeholder="Search: lockdown, visitor, bus, meds…" autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !draft.trim()}>Search</button>
      </form>
      {turns.length > 0 && (
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => { setTurns([]); setError(null); }}>
          Clear
        </button>
      )}
    </div>
  );
}

const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
