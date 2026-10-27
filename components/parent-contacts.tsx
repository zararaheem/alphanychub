"use client";

import { useMemo, useState } from "react";
import type { ParentContact } from "@/lib/types";
import { BulkEmail } from "@/components/bulk-email";

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
      <div className="between" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ maxWidth: 360, flex: "1 1 260px" }}>
          <label htmlFor="pc-search">Find a student, parent or grade</label>
          <input id="pc-search" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, grade or phone" />
        </div>
        <BulkEmail emails={shown.map((r) => r.email)} label={query ? "these parents" : "all parents"} />
      </div>
      {campuses.map((g) => {
        const list = shown.filter((r) => r.campus === g.campus);
        return (
          <section key={g.campus} className="stack-sm" aria-label={g.title}>
            <div className="between" style={{ alignItems: "center", marginTop: 8 }}>
              <h3 className="kicker" style={{ fontSize: 11 }}>{g.title} <span className="muted" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>· {new Set(list.map((r) => r.student)).size} students</span></h3>
              {campuses.length > 1 && <BulkEmail emails={list.map((r) => r.email)} label={g.campus === "early-years" ? "Early Years" : "Maiden Ln"} />}
            </div>
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
                            {r.phone && (
                              <a href={tel(r.phone)} className="call-btn" aria-label={`Call ${r.guardian ?? "parent"} of ${student}: ${r.phone}`}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg> {r.phone}
                              </a>
                            )}
                            {r.email && (
                              <a href={`mailto:${r.email}`} className="call-btn" title={r.email} aria-label={`Email ${r.guardian ?? "parent"} of ${student}: ${r.email}`}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg> Email
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
