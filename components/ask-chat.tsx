"use client";

import { useEffect, useRef, useState } from "react";
import { WhoToAsk } from "@/components/who-to-ask";

type Hit = { title: string; where: string; href?: string; external?: boolean; lines: string[] };
type Turn = { q: string; answer: string | null; results: Hit[] };

const STARTERS = [
  "What do I do in a lockdown?",
  "Visitor at the door",
  "Student is missing",
  "Taking students off campus",
  "Vendor contract",
  "Student medication",
];

// Each question gets an AI answer written from the hub's documents, plus the
// matching hub pages from keyword search. If the AI is unavailable (no key, no
// credits), the search results still come back on their own.
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
      const history = turns.flatMap((t) => (t.answer ? [{ role: "user", content: t.q }, { role: "assistant", content: t.answer }] : [])).slice(-6);
      const [ai, found] = await Promise.all([
        fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...history, { role: "user", content: q }] }) })
          .then(async (r) => (r.ok ? ((await r.json()) as { answer?: string }).answer ?? null : null))
          .catch(() => null),
        fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) })
          .then(async (r) => ((await r.json().catch(() => ({}))) as { results?: Hit[]; error?: string })),
      ]);
      if (!ai && !found.results) throw new Error(found.error ?? "Something went wrong. Try again.");
      setTurns((t) => [...t, { q, answer: ai, results: (found.results ?? []).slice(0, ai ? 3 : 6) }].slice(-6));
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
              <WhoToAsk compact />
            </details>
            <p className="muted">Try one of these, or type your own question:</p>
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
            {t.answer && <div className="bubble assistant"><span className="sr-only">Answer:</span><Rich text={t.answer} /></div>}
            {t.results.length > 0 ? (
              <>
                {t.answer && <p className="hit-label">Open in the hub</p>}
                <ul className="search-hits" aria-label={`Hub pages for ${t.q}`}>
                  {t.results.map((h, j) => (
                    <li key={j} className={`search-hit${j === 0 && !t.answer ? " top" : ""}${t.answer ? " slim" : ""}`}>
                      <div className="between" style={{ alignItems: "baseline", gap: 8 }}>
                        {h.href ? (
                          <a href={h.href} className="hit-title" {...(h.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                            {h.title}{h.external ? " ↗" : " →"}
                          </a>
                        ) : <b className="hit-title">{h.title}</b>}
                        <span className="hit-where">{h.where}</span>
                      </div>
                      {!t.answer && h.lines.length > 0 && (
                        <ul className="hit-lines">{h.lines.map((l, k) => <li key={k}>{bold(l)}</li>)}</ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : !t.answer && (
              <div className="bubble assistant">
                <p>Nothing in the hub matches that yet. Try different words (e.g. &ldquo;fire&rdquo;, &ldquo;visitor&rdquo;, &ldquo;bus&rdquo;), or check <b>Who do I ask?</b> above.</p>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">Looking through the hub…</div>}
        <div ref={end} />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask-input" className="sr-only">Ask the hub</label>
        <input
          id="ask-input" className="input" value={draft} placeholder="Ask anything: lockdown, visitor, bus, meds…" autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !draft.trim()}>Ask</button>
      </form>
      {turns.length > 0 && (
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => { setTurns([]); setError(null); }}>
          Clear
        </button>
      )}
    </div>
  );
}

// Minimal formatting: paragraphs, "- " bullets, "1. " steps and **bold**.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*[-•*]\s/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*[-•*]\s/, ""))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)]\s/.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*\d+[.)]\s/, ""))}</li>)}</ol>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{bold(l.replace(/^#+\s*/, ""))}</span>)}</p>;
      })}
    </>
  );
}

const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
