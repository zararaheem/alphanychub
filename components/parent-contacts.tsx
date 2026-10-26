"use client";

import { useMemo, useState } from "react";
import type { ParentContact } from "@/lib/types";

const GROUPS = [
  { campus: "early-years", title: "Early Years · William St" },
  { campus: "maiden-ln", title: "Grades 1–12 · Maiden Ln" },
] as const;

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

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
            <h3 className="kicker" style={{ marginTop: 8 }}>{g.title} <span className="muted" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>· {new Set(list.map((r) => r.student)).size} students</span></h3>
            {list.length === 0 ? (
              <p className="muted small">No matches.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 640 }}>
                  <thead>
                    <tr><th scope="col">Student</th><th scope="col">Grade</th><th scope="col">Parent / guardian</th><th scope="col">Phone</th><th scope="col">Email</th></tr>
                  </thead>
                  <tbody>
                    {list.map((r, i) => {
                      const first = i === 0 || list[i - 1].student !== r.student;
                      return (
                        <tr key={r.id} style={first ? undefined : { borderTop: 0 }}>
                          <td style={first ? undefined : { borderTop: 0 }}>{first && <strong>{r.student}</strong>}</td>
                          <td style={first ? undefined : { borderTop: 0 }} className="muted">{first && r.grade}</td>
                          <td style={first ? undefined : { borderTop: 0 }}>
                            {r.guardian}{r.relationship && <span className="muted small"> · {r.relationship}</span>}
                            {r.notes && first && <div className="small muted">{r.notes}</div>}
                          </td>
                          <td style={first ? { whiteSpace: "nowrap" } : { borderTop: 0, whiteSpace: "nowrap" }}>{r.phone && <a href={tel(r.phone)} style={{ fontWeight: 700 }}>{r.phone}</a>}</td>
                          <td style={first ? undefined : { borderTop: 0 }} className="small">{r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
