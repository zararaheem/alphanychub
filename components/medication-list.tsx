"use client";

import { useMemo, useState } from "react";
import { deleteMedication, saveMedication } from "@/lib/actions";
import type { Medication } from "@/lib/types";

const ROUTES = ["By mouth (tablet / capsule)", "By mouth (liquid)", "Inhaler", "Injection (e.g. EpiPen)", "Topical / cream", "Eye or ear drops", "Other"];

// Student medication records: search, then open a student for the full details.
export function MedicationList({ rows, manager }: { rows: Medication[]; manager: boolean }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.student} ${r.medication} ${r.level ?? ""}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);

  return (
    <div className="stack">
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <label htmlFor="med-q" className="sr-only">Search medication records</label>
        <input id="med-q" className="input" style={{ flex: "1 1 240px" }} placeholder="Search by student or medication" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="small muted">{shown.length} of {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p className="empty">No medication records yet.{manager ? " Add the first one below." : " An admin or Campus Coordinator adds them."}</p>
      ) : (
        <ul className="med-list">
          {shown.map((r) => (
            <li key={r.id}>
              <details className="med-card">
                <summary>
                  <span className="med-who"><b>{r.student}</b>{r.level && <span className="muted"> · {r.level}</span>}</span>
                  <span className="med-when">{r.times ?? r.schedule}</span>
                  <span className="med-what muted">{r.medication}</span>
                </summary>
                <dl className="med-details">
                  <div><dt>When</dt><dd>{r.schedule}{r.times ? ` · ${r.times}` : ""}</dd></div>
                  <div><dt>Medication</dt><dd>{r.medication}</dd></div>
                  {r.dose && <div><dt>Dose</dt><dd>{r.dose}</dd></div>}
                  {r.route && <div><dt>How it&apos;s given</dt><dd>{r.route}</dd></div>}
                  {r.storage && <div><dt>Where stored</dt><dd>{r.storage}</dd></div>}
                  {r.instructions && <div><dt>Instructions</dt><dd className="pre">{r.instructions}</dd></div>}
                </dl>
                {manager && (
                  <div className="stack-sm no-print">
                    <MedEditor rec={r} />
                    <form action={deleteMedication}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn danger sm">Remove {r.student}&apos;s record</button>
                    </form>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
      {manager && <MedEditor />}
    </div>
  );
}

function MedEditor({ rec }: { rec?: Medication }) {
  const k = rec?.id ?? "new";
  return (
    <details className="editor">
      <summary>{rec ? "Edit record" : "+ Add a medication record"}</summary>
      <form action={saveMedication} className="form-grid" style={{ paddingBottom: 12 }}>
        {rec && <input type="hidden" name="id" value={rec.id} />}
        <Input id={`m-st-${k}`} name="student" label="Student" value={rec?.student} required />
        <Input id={`m-lv-${k}`} name="level" label="Level" value={rec?.level} placeholder="e.g. LL, MS" />
        <div className="field">
          <label htmlFor={`m-cp-${k}`}>Campus</label>
          <select id={`m-cp-${k}`} name="campus" className="input" defaultValue={rec?.campus ?? "maiden-ln"}>
            <option value="maiden-ln">Maiden Ln</option>
            <option value="early-years">Early Years</option>
          </select>
        </div>
        <Input id={`m-md-${k}`} name="medication" label="Medication" value={rec?.medication} required />
        <Input id={`m-ds-${k}`} name="dose" label="Dose" value={rec?.dose} placeholder="e.g. 2 capsules" />
        <div className="field">
          <label htmlFor={`m-rt-${k}`}>How it&apos;s given</label>
          <select id={`m-rt-${k}`} name="route" className="input" defaultValue={rec?.route ?? ROUTES[0]}>
            {ROUTES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <Input id={`m-sc-${k}`} name="schedule" label="Days" value={rec?.schedule ?? "Every school day"} />
        <Input id={`m-tm-${k}`} name="times" label="Times" value={rec?.times} placeholder="e.g. 11am and 3pm" />
        <Input id={`m-sg-${k}`} name="storage" label="Where stored" value={rec?.storage} />
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor={`m-in-${k}`}>Instructions</label>
          <textarea id={`m-in-${k}`} name="instructions" className="input" rows={4} defaultValue={rec?.instructions ?? ""} />
        </div>
        <button type="submit" className="btn" style={{ alignSelf: "flex-start" }}>{rec ? "Save" : "Add record"}</button>
      </form>
    </details>
  );
}

function Input({ id, name, label, value, placeholder, required }: { id: string; name: string; label: string; value?: string | null; placeholder?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} className="input" defaultValue={value ?? ""} placeholder={placeholder} required={required} />
    </div>
  );
}
