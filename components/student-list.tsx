"use client";

import { useMemo, useState } from "react";
import type { Student } from "@/lib/types";
import { gradeRank, levelRank } from "@/lib/levels";

export function StudentList({ rows }: { rows: Student[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query ? rows.filter((r) => `${r.first_name} ${r.last_name} ${r.grade ?? ""} ${r.level ?? ""}`.toLowerCase().includes(query)) : rows),
    [rows, query],
  );
  const levels = [...new Set(rows.map((r) => r.level ?? "Other"))].sort((a, b) => levelRank(a) - levelRank(b));

  return (
    <div className="stack">
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="stu-search">Find a student</label>
        <input id="stu-search" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, grade or level" />
      </div>
      {shown.length === 0 && <p className="empty">No one matches &ldquo;{q}&rdquo;.</p>}
      <div className="level-grid">
        {levels.map((lv) => {
          const list = shown
            .filter((r) => (r.level ?? "Other") === lv)
            .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || a.last_name.localeCompare(b.last_name));
          if (!list.length) return null;
          return (
            <section key={lv} className="card" aria-label={lv} style={{ gap: 8 }}>
              <div className="between" style={{ alignItems: "baseline" }}>
                <h2 style={{ fontSize: 15 }}>{lv}</h2>
                <span className="pill mint">{list.length}</span>
              </div>
              <ul className="student-rows">
                {list.map((s) => (
                  <li key={s.id}>
                    <span>{s.first_name} {s.last_name}</span>
                    <span className="muted small">{s.grade === "PK" ? "PreK" : s.grade === "K" ? "K" : `Grade ${s.grade}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
