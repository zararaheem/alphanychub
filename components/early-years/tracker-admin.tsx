"use client";

import { useState } from "react";
import { addTrackerPerson, setTrackerAccessFor, setTrackerClass } from "@/app/tracker/actions";

// Superadmin: who can open the Montessori tracker, and which class they teach.
// People sign in with their own Google (@alpha.school) account.

export type Person = { email: string; name: string | null; role: string; tracker: boolean; ey_class: "PK" | "K" | null };
type Cls = "PK" | "K" | "";
const CLASS: Record<string, string> = { PK: "PreK", K: "Kinder", "": "Both" };
const ROLE: Record<string, string> = { admin: "Admin", coordinator: "Campus Coordinator", lead: "Lead Guide", guide: "Guide", staff: "Staff" };

export function TrackerAdmin({ people, flash }: { people: Person[]; flash: (m: string) => void }) {
  const [rows, setRows] = useState(people);
  const [q, setQ] = useState("");
  const [add, setAdd] = useState({ email: "", name: "", cls: "" as Cls });
  const [showAll, setShowAll] = useState(false);
  const has = (p: Person) => p.tracker || p.role === "admin";
  const list = rows
    .filter((p) => (showAll || q ? true : has(p)))
    .filter((p) => !q || `${p.name ?? ""} ${p.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(has(b)) - Number(has(a)) || (a.name ?? a.email).localeCompare(b.name ?? b.email));

  async function toggle(p: Person) {
    const on = !p.tracker;
    if (!on && !confirm(`Remove ${p.name ?? p.email}'s access to the tracker? Their past notes stay.`)) return;
    setRows((r) => r.map((x) => (x.email === p.email ? { ...x, tracker: on } : x)));
    const res = await setTrackerAccessFor(p.email, on);
    if (!res.ok) { flash("That didn't save."); setRows((r) => r.map((x) => (x.email === p.email ? { ...x, tracker: !on } : x))); return; }
    flash(on ? `${p.name ?? p.email} can now use the tracker` : `${p.name ?? p.email} no longer has access`);
  }

  async function setClass(p: Person, cls: Cls) {
    setRows((r) => r.map((x) => (x.email === p.email ? { ...x, ey_class: cls || null } : x)));
    if (!(await setTrackerClass(p.email, cls || null)).ok) flash("That didn't save.");
  }

  async function addPerson() {
    const r = await addTrackerPerson({ email: add.email, name: add.name, eyClass: add.cls || null });
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    const email = add.email.trim().toLowerCase();
    setRows((rs) => {
      const found = rs.some((x) => x.email === email);
      const row: Person = { email, name: add.name.trim() || null, role: "guide", tracker: true, ey_class: add.cls || null };
      return found ? rs.map((x) => (x.email === email ? { ...x, tracker: true, ey_class: add.cls || null, name: add.name.trim() || x.name } : x)) : [...rs, row];
    });
    flash(`${add.name || email} can now sign in to the tracker`);
    setAdd({ email: "", name: "", cls: "" });
  }

  return (
    <>
      <section className="card stack-sm">
        <h2 style={{ fontSize: 17 }}>Add a person</h2>
        <div className="mw-two">
          <input className="input" type="email" placeholder="name@alpha.school" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} aria-label="Email" />
          <input className="input" placeholder="Name they go by" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} aria-label="Name" />
        </div>
        <div className="row mw-wrap">
          <div className="seg" role="group" aria-label="Class">
            {(["PK", "K", ""] as Cls[]).map((c) => <button key={c || "both"} type="button" aria-pressed={add.cls === c} onClick={() => setAdd({ ...add, cls: c })}>{CLASS[c]}</button>)}
          </div>
          <button type="button" className="btn sm" disabled={!add.email.trim()} onClick={addPerson}>Give access</button>
        </div>
        <span className="small muted">They open <b>nychub.vercel.app/ey-tracker</b> and sign in with Google. New people are added to the hub as a Guide.</span>
      </section>

      <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
        <input className="input mw-search" placeholder="Find a person" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show everyone on the hub</label>
      </div>
      <ul className="ey-list">
        {list.map((p) => (
          <li key={p.email} className="ey-row">
            <div className="ey-who">
              <span className="ey-name"><b>{p.name ?? p.email}</b> <span className="small muted">{ROLE[p.role] ?? p.role}</span></span>
              <span className="small muted">{p.email}</span>
            </div>
            <div className="row mw-wrap">
              {has(p) && (
                <select className="input mw-level" aria-label={`${p.name ?? p.email}'s class`} value={p.ey_class ?? ""} onChange={(e) => setClass(p, e.target.value as Cls)}>
                  <option value="PK">PreK</option><option value="K">Kinder</option><option value="">Both classes</option>
                </select>
              )}
              {p.role === "admin" ? <span className="pill mint">Superadmin</span> : (
                <button type="button" className="ey-step" aria-pressed={p.tracker} onClick={() => toggle(p)}>{p.tracker ? "Remove" : "Give access"}</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
