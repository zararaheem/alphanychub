"use client";

import { useEffect, useRef, useState } from "react";
import { WhoToAsk } from "@/components/who-to-ask";

type Hit = { title: string; where: string; href?: string; external?: boolean; lines: string[] };
type Turn = { q: string; answer: string | null; results: Hit[]; logId?: number | null; rated?: boolean };

const STARTERS = [
  "Imagination Playground is closed. Where do we go?",
  "Someone not on the pickup list is here for a child",
  "A student keeps leaving class without asking",
  "A parent sent Tylenol in a backpack",
  "Can I buy supplies for a class project?",
  "What do I do in a lockdown?",
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
      const searching = fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) })
        .then(async (r) => ((await r.json().catch(() => ({}))) as { results?: Hit[]; error?: string }))
        .catch(() => ({ results: [] as Hit[] }));
      setTurns((t) => [...t, { q, answer: "", results: [] }].slice(-6));
      const put = (patch: Partial<Turn>) => setTurns((ts) => ts.map((x, j) => (j === ts.length - 1 && x.q === q ? { ...x, ...patch } : x)));

      // The answer streams in as it's written.
      let answer = "";
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...history, { role: "user", content: q }] }) }).catch(() => null);
      if (res?.ok && res.body) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += dec.decode(value, { stream: true });
          put({ answer });
        }
      } else if (res) {
        const msg = ((await res.json().catch(() => ({}))) as { error?: string }).error;
        if (msg) setError(msg);
      }
      const found = await searching;
      put({ answer: answer || null, results: (found.results ?? []).slice(0, answer ? 3 : 6) });
      if (!answer && !found.results?.length) throw new Error("Something went wrong. Try again.");
      // Log the question so admins can see what staff need (never blocks the answer).
      fetch("/api/ask/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, answer: answer || null, hits: found.results?.length ?? 0 }) })
        .then(async (r) => ((await r.json()) as { id?: number | null }).id ?? null)
        .then((logId) => setTurns((ts) => ts.map((x) => (x.q === q && x.logId === undefined ? { ...x, logId } : x))))
        .catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  function rate(i: number, helpful: boolean) {
    const t = turns[i];
    if (!t?.logId) return;
    setTurns((ts) => ts.map((x, j) => (j === i ? { ...x, rated: true } : x)));
    fetch("/api/ask/log", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.logId, helpful }) }).catch(() => {});
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
            <p className="muted">Describe a question or a situation in your own words. You&apos;ll get what to do, who to check with, and where it&apos;s written. Try one of these:</p>
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
            {t.logId && (t.rated ? <p className="hit-label">Thanks, noted.</p> : (
              <div className="row ask-rate">
                <span className="small muted">Did this help?</span>
                <button type="button" className="chip" onClick={() => rate(i, true)} aria-label="Yes, this helped">👍</button>
                <button type="button" className="chip" onClick={() => rate(i, false)} aria-label="No, this didn't help">👎</button>
                <a href="/requests?new=content#form" className="small">Tell us what&apos;s missing</a>
              </div>
            ))}
          </div>
        ))}
        {busy && !turns[turns.length - 1]?.answer && <div className="bubble assistant muted">Checking the policies…</div>}
        <div ref={end} />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask-input" className="sr-only">Ask the hub</label>
        <input
          id="ask-input" className="input" value={draft} placeholder="Describe the situation or ask a question…" autoComplete="off"
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

// Minimal formatting: paragraphs, "- " bullets, "1. " steps and **bold**,
// with lists allowed to follow a heading line in the same block.
function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  text.split(/\n{2,}/).forEach((b, i) => {
    let list: { kind: "ul" | "ol"; items: string[] } | null = null;
    let para: string[] = [];
    const flushPara = (k: string) => { if (para.length) out.push(<p key={k}>{para.map((l, j) => <span key={j}>{j > 0 && <br />}{bold(l)}</span>)}</p>); para = []; };
    const flushList = (k: string) => {
      if (!list) return;
      const items = list.items.map((l, j) => <li key={j}>{bold(l)}</li>);
      out.push(list.kind === "ul" ? <ul key={k}>{items}</ul> : <ol key={k}>{items}</ol>);
      list = null;
    };
    b.split("\n").filter((l) => l.trim()).forEach((raw, j) => {
      const l = raw.replace(/^#+\s*/, "");
      const kind = /^\s*[-•*]\s/.test(l) ? "ul" : /^\s*\d+[.)]\s/.test(l) ? "ol" : null;
      if (kind) {
        flushPara(`${i}p${j}`);
        if (list && list.kind !== kind) flushList(`${i}l${j}`);
        list = list ?? { kind, items: [] };
        list.items.push(l.replace(/^\s*([-•*]|\d+[.)])\s/, ""));
      } else {
        flushList(`${i}l${j}`);
        para.push(l);
      }
    });
    flushList(`${i}le`);
    flushPara(`${i}pe`);
  });
  return <>{out}</>;
}

const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
