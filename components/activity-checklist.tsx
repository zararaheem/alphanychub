"use client";

import { useState } from "react";
import { ALSO_CHECK, CHECKLIST_TITLE, CORE_SIX, type CheckItem } from "@/lib/checklist";

// Tick-through version for guides on the Workshops tab. Ticks stay on this
// device only and reset with the Clear button.
export function ActivityChecklist() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (n: number) => setDone((d) => { const x = new Set(d); if (x.has(n)) x.delete(n); else x.add(n); return x; });
  const total = CORE_SIX.length + ALSO_CHECK.length;

  const List = ({ title, items }: { title: string; items: CheckItem[] }) => (
    <div className="stack-sm">
      <h3 className="label-caps">{title}</h3>
      <ul className="check-list">
        {items.map((c) => (
          <li key={c.n}>
            <label>
              <input type="checkbox" checked={done.has(c.n)} onChange={() => toggle(c.n)} />
              <span className="check-text">
                <span className={done.has(c.n) ? "done" : ""}>{c.n}. {c.check}</span>
                {c.how && <small className="check-how">{c.how}</small>}
              </span>
            </label>
            {c.link && (/^https?:/.test(c.link.href)
              ? <a href={c.link.href} target="_blank" rel="noopener noreferrer" className="check-link">{c.link.label} ↗</a>
              : <a href={c.link.href} className="check-link">{c.link.label} →</a>)}
            <span className="pill mint">{c.who}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <details className="card checklist-card" open>
      <summary className="between" style={{ alignItems: "center", cursor: "pointer" }}>
        <span className="card-title">{CHECKLIST_TITLE}</span>
        <span className="row" style={{ gap: 8 }}>
          <span className={`pill ${done.size === total ? "mint" : ""}`}>{done.size}/{total} checked</span>
        </span>
      </summary>
      <div className="checklist-grid">
        <List title="The core six" items={CORE_SIX} />
        <List title="Also check" items={ALSO_CHECK} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <a href="/guides/checklist" className="btn ghost sm">Printable version</a>
        {done.size > 0 && <button type="button" className="btn ghost sm" onClick={() => setDone(new Set())}>Clear ticks</button>}
      </div>
    </details>
  );
}
