"use client";

import { useMemo, useState } from "react";
import type { ParentContact } from "@/lib/types";

const GROUPS = [
  { campus: "early-years", title: "Early Years · William St" },
  { campus: "maiden-ln", title: "Grades 1–12 · Maiden Ln" },
] as const;

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

// Groups consecutive rows (already sorted by grade, student) by student.
function students(rows: ParentContact[]): [string, ParentContact[]][] {
  const out: [string, ParentContact[]][] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last[0] === r.student) last[1].push(r);
    else out.push([r.student, [r]]);
  }
  return out;
}

export function ParentContacts({ rows }: { rows: ParentContact[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query ? rows.filter((r) => [r.student, r.guardian, r.grade, r.phone, r.email].some((v) => v?.toLowerCase().includes(query))) : rows),
    [rows, query],
  );
  const campuses = GROUPS.filter((g) => rows.some((r) => r.campus === g.campus));

  return (
    <div className="stack">
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="pc-search">Find a student or parent</label>
        <input id="pc-search" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, grade or phone" />
      </div>
      {campuses.map((g) => {
        const list = shown.filter((r) => r.campus === g.campus);
        return (
          <section key={g.campus} className="stack-sm" aria-label={g.title}>
            <h3 className="kicker" style={{ marginTop: 8, fontSize: 11 }}>{g.title} <span className="muted" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>· {new Set(list.map((r) => r.student)).size} students</span></h3>
            {list.length === 0 ? (
              <p className="muted small">No matches.</p>
            ) : (
              <ul className="contact-list">
                {students(list).map(([student, guardians]) => (
                  <li key={student} className="contact" style={{ alignItems: "flex-start" }}>
                    <div className="who" style={{ flex: "1 1 200px" }}>
                      <strong>{student}</strong>
                      {guardians[0].grade && <span className="role">{guardians[0].grade}</span>}
                      {guardians[0].notes && <span className="note">{guardians[0].notes}</span>}
                    </div>
                    <div className="stack-sm" style={{ flex: "2 1 320px", gap: 8 }}>
                      {guardians.map((r) => (
                        <div key={r.id} className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13.5 }}>
                            {r.guardian ?? "Parent"}{r.relationship && <span className="muted"> · {r.relationship}</span>}
                          </span>
                          <span className="actions" style={{ display: "flex", gap: 8 }}>
                            {r.phone && <a href={tel(r.phone)} className="call-btn" aria-label={`Call ${r.guardian ?? "parent"} of ${student}: ${r.phone}`}>{r.phone}</a>}
                            {r.email && (
                              <a href={`mailto:${r.email}`} className="icon-btn" title={r.email} aria-label={`Email ${r.guardian ?? "parent"} of ${student}: ${r.email}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                              </a>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
