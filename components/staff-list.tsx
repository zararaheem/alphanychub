"use client";

import { useMemo, useState } from "react";
import type { StaffMember } from "@/lib/types";
import { BulkEmail } from "@/components/bulk-email";

const GROUPS = [
  { campus: "unassigned", title: "Not assigned to a campus yet" },
  { campus: "all", title: "Both campuses" },
  { campus: "maiden-ln", title: "Maiden Ln" },
  { campus: "early-years", title: "Early Years · William St" },
] as const;

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

export function StaffList({ rows }: { rows: StaffMember[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query ? rows.filter((r) => [r.name, r.title, r.team, r.email, r.phone].some((v) => v?.toLowerCase().includes(query))) : rows),
    [rows, query],
  );
  const groups = GROUPS.filter((g) => rows.some((r) => r.campus === g.campus));

  return (
    <div className="stack">
      <div className="between" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ maxWidth: 360, flex: "1 1 260px" }}>
          <label htmlFor="staff-search">Find someone</label>
          <input id="staff-search" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, role, team or phone" />
        </div>
        <BulkEmail emails={shown.map((r) => r.email)} label={query ? "these staff" : "all staff"} />
      </div>
      {shown.length === 0 && <p className="empty">No one matches &ldquo;{q}&rdquo;.</p>}
      {groups.map((g) => {
        const list = shown.filter((r) => r.campus === g.campus);
        if (!list.length) return null;
        return (
          <section key={g.campus} className="stack-sm" aria-label={g.title}>
            {groups.length > 1 && <h3 className="label-caps">{g.title} · {list.length}</h3>}
            {ROLE_GROUPS.map((rg) => {
              const people = list.filter((s) => roleGroup(s) === rg);
              if (!people.length) return null;
              return (
                <div key={rg} className="stack-sm" style={{ gap: 8 }}>
                  <h4 className="role-head">{rg} <span className="muted">· {people.length}</span></h4>
            <ul className="staff-grid">
              {people.map((s) => (
                <li key={s.id} className="staff-card">
                  <span className="avatar" aria-hidden="true">{initials(s.name)}</span>
                  <div className="who">
                    <strong>{s.name}</strong>
                    {(s.title || shownTeam(s.team)) && <span className="role">{[s.title, shownTeam(s.team)].filter(Boolean).join(" · ")}</span>}
                    {s.notes && <span className="note">{s.notes}</span>}
                    <span className="staff-links">
                      {s.phone && <a href={tel(s.phone)}>{s.phone}</a>}
                      {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

// "Alpha" is everyone's company in the source sheet, so it adds nothing on a card.
const shownTeam = (team: string | null) => (team && team !== "Alpha" ? team : null);

// Headings on the Staff page, in this order.
const ROLE_GROUPS = ["Leadership", "Guides", "Alpha High", "Security", "Admissions & operations", "Other staff"] as const;
function roleGroup(s: StaffMember): (typeof ROLE_GROUPS)[number] {
  const t = `${s.title ?? ""}`.toLowerCase();
  if (s.team === "Security" || /guard|security/.test(t)) return "Security";
  if (s.team === "Alpha High" || /alpha high/.test(t)) return "Alpha High";
  if (/guide|specialist|teacher/.test(t)) return "Guides";
  if (/head|director|coordinator|dean|coo|vp|chief|officer/.test(t)) return "Leadership";
  if (/admission|operations|ops|porter|support/.test(t) || s.team === "Support") return "Admissions & operations";
  return "Other staff";
}
