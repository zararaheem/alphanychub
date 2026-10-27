"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What do I do in a lockdown?",
  "A visitor is at the door. What's the process?",
  "Who do I call if a student is missing?",
  "What do I need before taking students off campus?",
  "Can I sign a vendor contract?",
];

export function AskChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? "Something went wrong. Try again.");
      setTurns([...next, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setTurns(turns);
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
            <p className="muted">Try one of these, or type your own:</p>
            <div className="row" style={{ gap: 6 }}>
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role}`}>
            <span className="sr-only">{t.role === "user" ? "You asked:" : "Answer:"}</span>
            <Rich text={t.content} />
          </div>
        ))}
        {busy && <div className="bubble assistant muted">Looking through the hub…</div>}
        <div ref={end} />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask-input" className="sr-only">Your question</label>
        <textarea
          id="ask-input" className="input" rows={2} value={draft} placeholder="Ask about security, emergencies, trips, vendors…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
        />
        <button type="submit" className="btn" disabled={busy || !draft.trim()}>Ask</button>
      </form>
      {turns.length > 0 && (
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => { setTurns([]); setError(null); }}>
          Start over
        </button>
      )}
    </div>
  );
}

// Minimal formatting: paragraphs, "- " bullets, "1. " steps and **bold**.
function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*[-•*]\s/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*[-•*]\s/, ""))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)]\s/.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*\d+[.)]\s/, ""))}</li>)}</ol>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{bold(l.replace(/^#+\s*/, ""))}</span>)}</p>;
      })}
    </>
  );
}

const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
