"use client";

import { useState } from "react";
import {
  AREAS, AREA_NAME, DOMAINS, DOMAIN_NAME, type AreaId, type DomainId, type Skill, type Work,
} from "@/lib/montessori";
import { linkSkill, saveSkill, saveWork } from "@/app/tracker/actions";

// The knowledge base: lessons (from the PreK Crosswalk) and skills (the Wonder
// Lab Success Indicators). Anyone approved for the tracker can review, edit,
// add, link, or take things off the list. Nothing is deleted; past notes stay.

type Props = { works: Work[]; skills: Skill[]; links: [number, number][]; onSaved: () => void; flash: (m: string) => void };
type WorkEdit = { id?: number; area: AreaId; name: string; strand: string; direct_aim: string; indirect_aims: string; evidence: string; elof: string; checks: string };
type SkillEdit = { id?: number; domain: DomainId; name: string; indicator: string; benchmark: string; ican: string; home_support: string };

export function KnowledgeBase(p: Props) {
  const [tab, setTab] = useState<"lessons" | "skills">("lessons");
  return (
    <>
      <p className="small muted">Lessons come from the Montessori-Inspired PreK Crosswalk and skills from the Wonder Lab Success Indicators. Tap anything to review or edit it.</p>
      <nav className="seg-links" aria-label="Knowledge base">
        <a href="#lessons" aria-current={tab === "lessons" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("lessons"); }}>Lessons · {p.works.filter((w) => !w.archived).length}</a>
        <a href="#skills" aria-current={tab === "skills" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("skills"); }}>Skills · {p.skills.filter((s) => !s.archived).length}</a>
      </nav>
      {tab === "lessons" ? <Lessons {...p} /> : <Skills {...p} />}
    </>
  );
}

function Lessons({ works, skills, links, onSaved, flash }: Props) {
  const [area, setArea] = useState<AreaId>("pl");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [edit, setEdit] = useState<WorkEdit | null>(null);
  const term = q.trim().toLowerCase();
  const list = works.filter((w) => !w.archived && (term ? `${w.name} ${w.strand ?? ""} ${w.direct_aim ?? ""}`.toLowerCase().includes(term) : w.area === area));
  const strands = [...new Set(list.map((w) => w.strand ?? "Other"))];
  const linked = (workId: number) => new Set(links.filter(([, w]) => w === workId).map(([s]) => s));

  const blank = (): WorkEdit => ({ area, name: "", strand: "", direct_aim: "", indirect_aims: "", evidence: "", elof: "", checks: "" });
  const from = (w: Work): WorkEdit => ({ id: w.id, area: w.area, name: w.name, strand: w.strand ?? "", direct_aim: w.direct_aim ?? "", indirect_aims: w.indirect_aims ?? "", evidence: w.evidence ?? "", elof: w.elof ?? "", checks: w.checks ?? "" });

  async function save(archived = false) {
    if (!edit) return;
    const r = await saveWork({ ...edit, description: edit.direct_aim, archived });
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash(archived ? "Taken off the list" : "Saved");
    setEdit(null);
    if (r.id) setOpen(archived ? null : r.id);
    onSaved();
  }

  const form = edit && (
    <div className="stack-sm mw-form">
      <label className="stack-sm"><span className="label">Name</span><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
      <div className="mw-two">
        <label className="stack-sm"><span className="label">Area</span>
          <select className="input" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value as AreaId })}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="stack-sm"><span className="label">Strand</span><input className="input" value={edit.strand} placeholder="e.g. Care of Self" onChange={(e) => setEdit({ ...edit, strand: e.target.value })} /></label>
      </div>
      <label className="stack-sm"><span className="label">Direct aim</span><textarea className="input" rows={2} value={edit.direct_aim} onChange={(e) => setEdit({ ...edit, direct_aim: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">Indirect aims / transferable skills</span><textarea className="input" rows={2} value={edit.indirect_aims} onChange={(e) => setEdit({ ...edit, indirect_aims: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">What to look for (observable evidence)</span><textarea className="input" rows={2} value={edit.evidence} onChange={(e) => setEdit({ ...edit, evidence: e.target.value })} /></label>
      <div className="mw-two">
        <label className="stack-sm"><span className="label">ELOF goals</span><input className="input" value={edit.elof} placeholder="P-ATL 6; P-PMP 3" onChange={(e) => setEdit({ ...edit, elof: e.target.value })} /></label>
        <label className="stack-sm"><span className="label">Alpha PreK checks</span><input className="input" value={edit.checks} placeholder="PK-07; BC-19" onChange={(e) => setEdit({ ...edit, checks: e.target.value })} /></label>
      </div>
      <div className="row mw-wrap">
        <button type="button" className="btn sm" onClick={() => save()}>{edit.id ? "Save" : "Add lesson"}</button>
        <button type="button" className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button>
        {edit.id && <button type="button" className="btn ghost sm" onClick={() => { if (confirm(`Take “${edit.name}” off the list? Past notes stay.`)) save(true); }}>Remove</button>}
      </div>
    </div>
  );

  return (
    <>
      <div className="row mw-wrap">
        <input className="input mw-search" placeholder="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn outline sm" onClick={() => { setEdit(blank()); setOpen(null); }}>+ Add a lesson</button>
      </div>
      {edit && !edit.id && form}
      {!term && (
        <div className="seg">
          {AREAS.map((a) => <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => setArea(a.id)}>{a.name}</button>)}
        </div>
      )}
      {strands.map((st) => (
        <section key={st} className="ey-sec">
          <h2>{st}</h2>
          <ul className="ey-list">
            {list.filter((w) => (w.strand ?? "Other") === st).map((w) => {
              const on = linked(w.id);
              return (
                <li key={w.id} className="ey-row usual">
                  {edit?.id === w.id ? form : (
                    <>
                      <button type="button" className="mw-kid" aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id)}>
                        <b>{w.name}</b>
                        <span className="small muted">{w.direct_aim ?? "Add a direct aim"}{term ? ` · ${AREA_NAME[w.area]}` : ""}</span>
                      </button>
                      {open === w.id && (
                        <div className="stack-sm mw-detail">
                          {w.indirect_aims && <p className="small"><b>Indirect aims:</b> {w.indirect_aims}</p>}
                          {w.evidence && <p className="small"><b>Look for:</b> {w.evidence}</p>}
                          {w.elof && <p className="small"><b>ELOF:</b> {w.elof}</p>}
                          {w.common_core && <p className="small"><b>Common Core K:</b> {w.common_core}</p>}
                          {w.checks && <p className="small"><b>Alpha PreK checks:</b> {w.checks}</p>}
                          {w.ai_skills && <p className="small"><b>AI-competency skills:</b> {w.ai_skills}</p>}
                          <span className="label">Skills it builds</span>
                          <div className="row mw-wrap">
                            {skills.filter((s) => !s.archived).map((s) => on.has(s.id) && (
                              <button key={s.id} type="button" className="chip" aria-pressed title="Tap to unlink"
                                onClick={async () => { if ((await linkSkill(s.id, w.id, false)).ok) onSaved(); }}>{s.code} {s.name} ✕</button>
                            ))}
                            <select className="input mw-link" value="" aria-label="Link a skill" onChange={async (e) => {
                              const id = Number(e.target.value);
                              if (id && (await linkSkill(id, w.id, true)).ok) { flash("Linked"); onSaved(); }
                            }}>
                              <option value="">+ Link a skill</option>
                              {DOMAINS.map((d) => (
                                <optgroup key={d.id} label={d.name}>
                                  {skills.filter((s) => s.domain === d.id && !s.archived && !on.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.code} {s.name}</option>)}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          <button type="button" className="btn outline sm" style={{ width: "fit-content" }} onClick={() => setEdit(from(w))}>Edit lesson</button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function Skills({ works, skills, links, onSaved, flash }: Props) {
  const [domain, setDomain] = useState<DomainId>("ATL");
  const [open, setOpen] = useState<number | null>(null);
  const [edit, setEdit] = useState<SkillEdit | null>(null);
  const list = skills.filter((s) => s.domain === domain && !s.archived);
  const lessons = (id: number) => links.filter(([s]) => s === id).map(([, w]) => works.find((x) => x.id === w)).filter((w): w is Work => !!w && !w.archived);

  async function save(archived = false) {
    if (!edit) return;
    const r = await saveSkill({ ...edit, archived });
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash(archived ? "Taken off the list" : "Saved");
    setEdit(null);
    onSaved();
  }

  const form = edit && (
    <div className="stack-sm mw-form">
      <label className="stack-sm"><span className="label">Skill</span><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">Domain</span>
        <select className="input" value={edit.domain} onChange={(e) => setEdit({ ...edit, domain: e.target.value as DomainId })}>
          {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="stack-sm"><span className="label">What a guide can observe</span><textarea className="input" rows={2} value={edit.indicator} onChange={(e) => setEdit({ ...edit, indicator: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">End-of-year benchmark</span><textarea className="input" rows={2} value={edit.benchmark} onChange={(e) => setEdit({ ...edit, benchmark: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">“I can” statement (shown to families)</span><textarea className="input" rows={2} value={edit.ican} onChange={(e) => setEdit({ ...edit, ican: e.target.value })} /></label>
      <label className="stack-sm"><span className="label">How families can help at home</span><textarea className="input" rows={2} value={edit.home_support} onChange={(e) => setEdit({ ...edit, home_support: e.target.value })} /></label>
      <div className="row mw-wrap">
        <button type="button" className="btn sm" onClick={() => save()}>{edit.id ? "Save" : "Add skill"}</button>
        <button type="button" className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button>
        {edit.id && <button type="button" className="btn ghost sm" onClick={() => { if (confirm(`Take “${edit.name}” off the list?`)) save(true); }}>Remove</button>}
      </div>
    </div>
  );

  return (
    <>
      <div className="row mw-wrap">
        <select className="input mw-search" value={domain} aria-label="Domain" onChange={(e) => { setDomain(e.target.value as DomainId); setOpen(null); }}>
          {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.name} · {skills.filter((s) => s.domain === d.id && !s.archived).length}</option>)}
        </select>
        <button type="button" className="btn outline sm" onClick={() => setEdit({ domain, name: "", indicator: "", benchmark: "", ican: "", home_support: "" })}>+ Add a skill</button>
      </div>
      {edit && !edit.id && form}
      <h2 style={{ fontSize: 17 }}>{DOMAIN_NAME[domain]}</h2>
      <ul className="ey-list">
        {list.map((s) => (
          <li key={s.id} className="ey-row usual">
            {edit?.id === s.id ? form : (
              <>
                <button type="button" className="mw-kid" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <b>{s.name} <span className="small muted">{s.code}</span></b>
                  <span className="small muted">{s.indicator}</span>
                </button>
                {open === s.id && (
                  <div className="stack-sm mw-detail">
                    {s.ican && <p className="small"><b>I can:</b> “{s.ican}”</p>}
                    {s.benchmark && <p className="small"><b>End-of-year benchmark:</b> {s.benchmark}</p>}
                    {s.floor && <p className="small"><b>CDC floor:</b> {s.floor}</p>}
                    {s.stretch && <p className="small"><b>Stretch:</b> {s.stretch}</p>}
                    {s.home_support && <p className="small"><b>At home:</b> {s.home_support}</p>}
                    {s.elof && <p className="small"><b>ELOF:</b> {s.elof}</p>}
                    {s.checks.length > 0 && <p className="small"><b>CheckChart:</b> {s.checks.join(" · ")}</p>}
                    {s.tension && <p className="small mw-note"><b>Note:</b> {s.tension}</p>}
                    <p className="small"><b>Built by:</b> {lessons(s.id).map((w) => w.name).join(" · ") || "No lessons linked yet. Link them from a lesson."}</p>
                    <button type="button" className="btn outline sm" style={{ width: "fit-content" }}
                      onClick={() => setEdit({ id: s.id, domain: s.domain, name: s.name, indicator: s.indicator ?? "", benchmark: s.benchmark ?? "", ican: s.ican ?? "", home_support: s.home_support ?? "" })}>Edit skill</button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
