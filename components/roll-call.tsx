"use client";

import { useEffect, useState } from "react";

// Digital roll call on a class list (drills, trips). Tap a student to cycle:
// blank → Here → Absent today → blank. Marks stay on this device for the day,
// so a refresh or a dropped signal mid-drill doesn't lose them.

type Mark = "here" | "absent";
type Row = { id: number; first: string; last: string };
const full = (r: Row) => `${r.first} ${r.last}`;

const NEXT: Record<string, Mark | undefined> = { none: "here", here: "absent", absent: undefined };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export function RollCall({ listKey, title, rows }: { listKey: string; title: string; rows: Row[] }) {
  const storeKey = `roll:${today()}:${listKey}`;
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) setMarks(JSON.parse(saved));
    } catch {}
  }, [storeKey]);

  const save = (next: Record<number, Mark>) => {
    setMarks(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
  };
  const toggle = (id: number) => {
    const next = { ...marks };
    const m = NEXT[marks[id] ?? "none"];
    if (m) next[id] = m; else delete next[id];
    save(next);
  };

  const here = rows.filter((r) => marks[r.id] === "here");
  const absent = rows.filter((r) => marks[r.id] === "absent");
  const missing = rows.filter((r) => !marks[r.id]);
  const allIn = missing.length === 0;

  const summary = () => {
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    return [
      `${title} roll call · ${time}`,
      `Here: ${here.length}/${rows.length - absent.length}`,
      absent.length ? `Absent today: ${absent.map((r) => full(r)).join(", ")}` : null,
      missing.length ? `NOT ACCOUNTED FOR: ${missing.map((r) => full(r)).join(", ")}` : "All accounted for",
    ].filter(Boolean).join("\n");
  };
  const share = async () => {
    const text = summary();
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch {}
  };

  return (
    <>
      <div className={`roll-bar no-print${allIn ? " done" : ""}`} role="status">
        <span><b>{here.length}</b> here{absent.length ? ` · ${absent.length} absent today` : ""} · <b>{missing.length}</b> {allIn ? "missing" : "not yet"}</span>
        <span className="row" style={{ gap: 6 }}>
          <button type="button" className="btn sm" onClick={share}>{copied ? "Copied" : "Send count"}</button>
          {Object.keys(marks).length > 0 && (
            <button type="button" className="btn sm ghost" onClick={() => { if (confirm(`Clear all marks for ${title}?`)) save({}); }}>Clear</button>
          )}
        </span>
      </div>
      <table className="class-table roll">
        <thead>
          <tr><th className="n">#</th><th>Student</th><th className="box">Here</th><th className="notes">Notes</th></tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const m = marks[s.id];
            return (
              <tr key={s.id} className={m ? `is-${m}` : undefined} onClick={() => toggle(s.id)}>
                <td className="n">{i + 1}</td>
                <td><b>{s.last}</b>, {s.first}</td>
                <td className="box">
                  <button type="button" className="roll-mark" aria-label={`${full(s)}: ${m === "here" ? "here" : m === "absent" ? "absent today" : "not marked"}`}
                    onClick={(e) => { e.stopPropagation(); toggle(s.id); }}>
                    {m === "here" ? "✓" : m === "absent" ? "A" : ""}
                  </button>
                </td>
                <td className="notes">{m === "absent" ? <span className="small muted">Absent today</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
