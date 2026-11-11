"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AREAS, AREA_NAME, CYCLE, LEVEL, LEVELS, SUPPORT, mondayOf, niceDay, nyToday,
  type AreaId, type Cycle, type Level, type Observation, type Support, type Work,
} from "@/lib/montessori";
import { deleteObservation, logWork, saveWork, setLevel } from "@/app/tracker/actions";

// Montessori work tracker for Early Years guides: pick a child, log the work
// they did (level, cycle, support, a note), keep the list of works up to date.
// Everything is shared, so every guide sees the same children and notes.

type Kid = { id: number; first_name: string; last_name: string; grade: string | null };
type Screen = { s: "kids" } | { s: "kid"; id: number } | { s: "works" };
type ClassLevel = "all" | "PK" | "K";
type Draft = {
  kids: number[]; area: AreaId; work: number | null; level: Level | null; cycle: Cycle | null; support: Support | null;
  note: string; highlight: boolean; photos: { path: string; url: string }[]; ocr: string;
};

// Phone photos are large; shrink to 1600px JPEG before they leave the phone.
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
}

const GRADE: Record<string, string> = { PK: "PreK", K: "K" };

function Pill({ level }: { level: Level }) {
  const l = LEVEL[level];
  return <span className="mw-pill" style={{ background: l.bg, color: l.fg }}>{l.label}</span>;
}

export function WorkApp({ me }: { me: string }) {
  const supabase = useMemo(() => createClient(), []);
  const today = nyToday();
  const monday = mondayOf(today);
  const [screen, setScreen] = useState<Screen>({ s: "kids" });
  const [kids, setKids] = useState<Kid[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [status, setStatus] = useState<Map<string, Level>>(new Map());
  const [recent, setRecent] = useState<Observation[]>([]); // this week and last
  const [history, setHistory] = useState<Observation[]>([]); // the open child's
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [cls, setClsState] = useState<ClassLevel>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    try { const v = localStorage.getItem("ey:level"); if (v === "PK" || v === "K") setClsState(v); } catch {}
  }, []);
  const setCls = (v: ClassLevel) => { setClsState(v); try { localStorage.setItem("ey:level", v); } catch {} };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    const since = mondayOf(new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
    const [s, w, st, o] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, grade").eq("campus", "early-years").order("first_name"),
      supabase.from("ey_works").select("*").order("area").order("sort").order("name"),
      supabase.from("ey_work_status").select("student_id, work_id, level"),
      supabase.from("ey_observations").select("*").gte("day", since).order("created_at", { ascending: false }),
    ]);
    if (s.error) { flash("Couldn't load. Check your signal."); return; }
    setKids(s.data ?? []);
    setWorks((w.data ?? []) as Work[]);
    setStatus(new Map((st.data ?? []).map((r) => [`${r.student_id}:${r.work_id}`, r.level as Level])));
    setRecent((o.data ?? []) as Observation[]);
    setLoaded(true);
  }, [supabase]);

  const loadHistory = useCallback(async (id: number) => {
    const { data } = await supabase.from("ey_observations").select("*").eq("student_id", id).order("day", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    const rows = (data ?? []) as Observation[];
    setHistory(rows);
    // Private photos: short-lived links, only for people the bucket lets in.
    const paths = rows.flatMap((o) => o.photos ?? []);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("ey-work").createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : []))));
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (screen.s === "kid") loadHistory(screen.id); }, [screen, loadHistory]);

  const workOf = new Map(works.map((w) => [w.id, w]));
  const kidOf = new Map(kids.map((k) => [k.id, k]));
  const shown = kids
    .filter((k) => cls === "all" || k.grade === cls)
    .filter((k) => !q || `${k.first_name} ${k.last_name}`.toLowerCase().includes(q.toLowerCase()));
  const thisWeek = recent.filter((o) => o.day >= monday);
  const weekCount = (id: number) => thisWeek.filter((o) => o.student_id === id).length;
  const lastSeen = (id: number) => recent.find((o) => o.student_id === id)?.day;
  const name = (k: Kid) => <><b>{k.first_name}</b> {k.last_name}{k.grade && <span className="ey-grade">{GRADE[k.grade] ?? k.grade}</span>}</>;

  function openLog(kidId: number, workId: number | null = null) {
    const w = workId ? workOf.get(workId) : null;
    setDraft({ kids: [kidId], area: w?.area ?? "pl", work: workId, level: workId ? status.get(`${kidId}:${workId}`) ?? null : null, cycle: null, support: null, note: "", highlight: false, photos: [], ocr: "" });
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length || !draft) return;
    setBusy("Uploading…");
    const added: Draft["photos"] = [];
    for (const f of Array.from(files).slice(0, 8 - draft.photos.length)) {
      const blob = await shrink(f);
      const ext = blob.type === "image/jpeg" ? "jpg" : f.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${today.slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("ey-work").upload(path, blob, { contentType: blob.type || f.type });
      if (error) { flash("A photo didn't upload."); continue; }
      added.push({ path, url: URL.createObjectURL(blob) });
    }
    setBusy("");
    setDraft((d) => (d ? { ...d, photos: [...d.photos, ...added] } : d));
  }

  async function readWriting(path: string) {
    setBusy("Reading the writing…");
    const res = await fetch("/api/tracker/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
    const out = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    setBusy("");
    if (!res.ok || !out.text) { flash(out.error ?? "Couldn't read that photo."); return; }
    setDraft((d) => (d ? { ...d, ocr: d.ocr ? `${d.ocr}\n\n${out.text}` : out.text! } : d));
  }

  async function save() {
    if (!draft?.work || !draft.kids.length) return;
    setSaving(true);
    const r = await logWork({ studentIds: draft.kids, workId: draft.work, level: draft.level, cycle: draft.cycle, support: draft.support, note: draft.note, highlight: draft.highlight, photos: draft.photos.map((p) => p.path), ocrText: draft.ocr });
    setSaving(false);
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash(draft.kids.length > 1 ? `Logged for ${draft.kids.length} children` : "Logged");
    setDraft(null);
    await load();
    if (screen.s === "kid") loadHistory(screen.id);
  }

  // ------------------------------------------------------------ log sheet
  const sheet = draft && (
    <div className="mw-sheet" role="dialog" aria-label="Log a work">
      <div className="mw-sheet-in stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Log a work</h2>
          <button type="button" className="btn ghost sm" onClick={() => setDraft(null)}>Close</button>
        </div>

        <div className="stack-sm">
          <span className="label">Children</span>
          <div className="row mw-wrap">
            {kids.filter((k) => cls === "all" || k.grade === cls || draft.kids.includes(k.id)).map((k) => (
              <button key={k.id} type="button" className="chip" aria-pressed={draft.kids.includes(k.id)}
                onClick={() => setDraft({ ...draft, kids: draft.kids.includes(k.id) ? draft.kids.filter((x) => x !== k.id) : [...draft.kids, k.id] })}>
                {k.first_name.replace(/\s*\(.*\)/, "")} {k.last_name[0]}.
              </button>
            ))}
          </div>
          <span className="small muted">Tap more children to log a group lesson for each of them.</span>
        </div>

        <div className="stack-sm">
          <span className="label">Work</span>
          <div className="seg">
            {AREAS.map((a) => <button key={a.id} type="button" aria-pressed={draft.area === a.id} onClick={() => setDraft({ ...draft, area: a.id })}>{a.name}</button>)}
          </div>
          <div className="row mw-wrap">
            {works.filter((w) => w.area === draft.area && !w.archived).map((w) => (
              <button key={w.id} type="button" className="chip" aria-pressed={draft.work === w.id}
                onClick={() => setDraft({ ...draft, work: w.id, level: draft.kids.length === 1 ? status.get(`${draft.kids[0]}:${w.id}`) ?? draft.level : draft.level })}>
                {w.name}
              </button>
            ))}
          </div>
          {draft.work && workOf.get(draft.work)?.description && <p className="small muted">{workOf.get(draft.work)!.description}</p>}
        </div>

        <div className="stack-sm">
          <span className="label">Level</span>
          <div className="seg">
            {LEVELS.map((l) => <button key={l} type="button" aria-pressed={draft.level === l} onClick={() => setDraft({ ...draft, level: l })}>{LEVEL[l].label}</button>)}
          </div>
        </div>
        <div className="mw-two">
          <div className="stack-sm">
            <span className="label">Work cycle</span>
            <div className="seg">
              {(Object.keys(CYCLE) as Cycle[]).map((c) => <button key={c} type="button" aria-pressed={draft.cycle === c} onClick={() => setDraft({ ...draft, cycle: draft.cycle === c ? null : c })}>{CYCLE[c]}</button>)}
            </div>
          </div>
          <div className="stack-sm">
            <span className="label">How it started</span>
            <div className="seg">
              {(Object.keys(SUPPORT) as Support[]).map((c) => <button key={c} type="button" aria-pressed={draft.support === c} onClick={() => setDraft({ ...draft, support: draft.support === c ? null : c })}>{SUPPORT[c]}</button>)}
            </div>
          </div>
        </div>
        <label className="stack-sm">
          <span className="label">What you saw</span>
          <textarea className="input" rows={3} value={draft.note} placeholder="e.g. Built rods 1–6 in order and counted each one; asked for help with 7–10."
            onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>
        <div className="stack-sm">
          <span className="label">Photos or scans of the work</span>
          {draft.photos.length > 0 && (
            <div className="mw-photos">
              {draft.photos.map((p) => (
                <figure key={p.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Work photo" />
                  <button type="button" className="btn ghost sm" onClick={() => readWriting(p.path)}>Read the writing</button>
                </figure>
              ))}
            </div>
          )}
          <label className="btn outline sm mw-upload">
            {draft.photos.length ? "Add another photo" : "Take or add a photo"}
            <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </label>
          {busy && <span className="small muted" role="status">{busy}</span>}
          <span className="small muted">Photos are private to approved Early Years staff. For written work, tap “Read the writing” to type it out for you.</span>
        </div>
        {(draft.ocr || draft.photos.length > 0) && (
          <label className="stack-sm">
            <span className="label">Writing in the work</span>
            <textarea className="input" rows={3} value={draft.ocr} placeholder="Filled in when you tap “Read the writing”, or type it" onChange={(e) => setDraft({ ...draft, ocr: e.target.value })} />
          </label>
        )}
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={draft.highlight} onChange={(e) => setDraft({ ...draft, highlight: e.target.checked })} />
          <span>Highlight this in the weekly report</span>
        </label>
        <button type="button" className="btn" disabled={!draft.work || !draft.kids.length || saving || !!busy} onClick={save}>
          {saving ? "Saving…" : draft.kids.length > 1 ? `Save for ${draft.kids.length} children` : "Save"}
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------ screens
  const top = (
    <div className="ey-top">
      <div>
        <span className="kicker">Early Years · Wonder Lab</span>
        <h1>{screen.s === "works" ? "Works" : screen.s === "kid" ? "Student" : "Students"}</h1>
        <p className="small muted">Week of {niceDay(monday, { month: "long", day: "numeric" })}</p>
      </div>
      <nav className="seg-links" aria-label="Tracker">
        <a href="#students" aria-current={screen.s !== "works" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setScreen({ s: "kids" }); }}>Students</a>
        <a href="#works" aria-current={screen.s === "works" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setScreen({ s: "works" }); }}>Works</a>
        <a href="/tracker/report">Weekly report</a>
      </nav>
    </div>
  );

  let body: React.ReactNode = <p className="muted">Loading…</p>;
  if (loaded && screen.s === "kids") {
    const seen = shown.filter((k) => weekCount(k.id) > 0).length;
    body = (
      <>
        <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
          <div className="seg-links" role="group" aria-label="Class">
            {(["all", "PK", "K"] as ClassLevel[]).map((v) => (
              <a key={v} href={`#${v}`} aria-current={cls === v ? "page" : undefined} onClick={(e) => { e.preventDefault(); setCls(v); }}>
                {v === "all" ? `All · ${kids.length}` : `${GRADE[v]} · ${kids.filter((k) => k.grade === v).length}`}
              </a>
            ))}
          </div>
          <input className="input mw-search" placeholder="Find a child" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={`roll-bar${seen === shown.length ? " done" : ""}`} role="status">
          <span><b>{seen}</b> of {shown.length} observed this week · {thisWeek.filter((o) => shown.some((k) => k.id === o.student_id)).length} works logged</span>
        </div>
        <ul className="ey-list">
          {shown.map((k) => {
            const n = weekCount(k.id);
            const last = lastSeen(k.id);
            return (
              <li key={k.id} className={`ey-row${n === 0 ? " changed" : ""}`}>
                <button type="button" className="mw-kid" onClick={() => setScreen({ s: "kid", id: k.id })}>
                  <span className="ey-name">{name(k)}</span>
                  <span className="small muted">{n ? `${n} this week` : "Not observed this week"}{last ? ` · last ${last === today ? "today" : niceDay(last)}` : ""}</span>
                </button>
                <button type="button" className="ey-step" onClick={() => openLog(k.id)}>+ Log</button>
              </li>
            );
          })}
        </ul>
      </>
    );
  } else if (loaded && screen.s === "kid") {
    const k = kidOf.get(screen.id);
    if (k) body = (
      <>
        <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn ghost sm" onClick={() => setScreen({ s: "kids" })}>← All students</button>
          <button type="button" className="btn sm" onClick={() => openLog(k.id)}>+ Log a work</button>
        </div>
        <h2 className="ey-name" style={{ fontSize: 22 }}>{name(k)}</h2>

        <section className="ey-sec">
          <h2>Recent work</h2>
          {history.length === 0 ? <p className="small muted">Nothing logged yet. Tap “Log a work”.</p> : (
            <ul className="mw-feed">
              {history.slice(0, 12).map((o) => (
                <li key={o.id}>
                  <div className="row mw-wrap" style={{ gap: 8 }}>
                    <b>{o.work_id ? workOf.get(o.work_id)?.name ?? "Work" : "Work"}</b>
                    {o.level && <Pill level={o.level} />}
                    {o.highlight && <span className="mw-star" title="Highlight">★</span>}
                    <span className="small muted">{niceDay(o.day)} · {o.by_name}</span>
                  </div>
                  {o.note && <p className="small">{o.note}</p>}
                  {o.photos?.length > 0 && (
                    <div className="mw-photos">
                      {o.photos.map((p) => urls[p] && (
                        <a key={p} href={urls[p]} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urls[p]} alt="Work photo" />
                        </a>
                      ))}
                    </div>
                  )}
                  {o.ocr_text && <p className="small mw-ocr">{o.ocr_text}</p>}
                  <span className="small muted">{[o.cycle && CYCLE[o.cycle], o.support && SUPPORT[o.support]].filter(Boolean).join(" · ")}</span>
                  {o.by_email && (
                    <button type="button" className="btn ghost sm mw-del" onClick={async () => { if (confirm("Delete this entry?")) { await deleteObservation(o.id); loadHistory(k.id); load(); } }}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {AREAS.map((a) => {
          const list = works.filter((w) => w.area === a.id && !w.archived);
          if (!list.length) return null;
          return (
            <section key={a.id} className="ey-sec">
              <h2>{a.name}</h2>
              <ul className="ey-list">
                {list.map((w) => {
                  const lv = status.get(`${k.id}:${w.id}`);
                  return (
                    <li key={w.id} className="ey-row">
                      <div className="ey-who">
                        <span>{w.name}</span>
                        {lv ? <Pill level={lv} /> : <span className="small muted">Not started</span>}
                      </div>
                      <div className="ey-steps">
                        <select className="input mw-level" aria-label={`${w.name} level`} value={lv ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value as Level;
                            setStatus((m) => new Map(m).set(`${k.id}:${w.id}`, v));
                            const r = await setLevel(k.id, w.id, v);
                            if (!r.ok) { flash("That didn't save."); load(); }
                          }}>
                          <option value="" disabled>Set level</option>
                          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL[l].label}</option>)}
                        </select>
                        <button type="button" className="ey-step" onClick={() => openLog(k.id, w.id)}>Log</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </>
    );
  } else if (loaded && screen.s === "works") {
    body = <WorksEditor works={works} onSaved={load} flash={flash} />;
  }

  return (
    <main className="wrap stack ey mw">
      {top}
      {body}
      {sheet}
      <p className="small muted">Signed in as {me}. Everyone on the Early Years team sees the same notes.</p>
      {toast && <div className="ey-toast" role="status">{toast}</div>}
    </main>
  );
}

// The list of works: add one, rename it, describe it, or take it off the list.
function WorksEditor({ works, onSaved, flash }: { works: Work[]; onSaved: () => void; flash: (m: string) => void }) {
  const [area, setArea] = useState<AreaId>("pl");
  const [edit, setEdit] = useState<{ id?: number; name: string; description: string } | null>(null);
  const list = works.filter((w) => w.area === area);

  async function save(archived = false) {
    if (!edit) return;
    const r = await saveWork({ id: edit.id, area, name: edit.name, description: edit.description, archived });
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash(archived ? "Taken off the list" : "Saved");
    setEdit(null);
    onSaved();
  }

  return (
    <>
      <p className="small muted">The works guides log. Anyone on the team can add one or change its name and description.</p>
      <div className="seg">
        {AREAS.map((a) => <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => { setArea(a.id); setEdit(null); }}>{a.name}</button>)}
      </div>
      <ul className="ey-list">
        {list.filter((w) => !w.archived).map((w) => (
          <li key={w.id} className="ey-row usual">
            {edit?.id === w.id ? (
              <>
                <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Name" />
                <textarea className="input" rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} aria-label="Description" placeholder="What the work is and what it builds" />
                <div className="row mw-wrap">
                  <button type="button" className="btn sm" onClick={() => save()}>Save</button>
                  <button type="button" className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button>
                  <button type="button" className="btn ghost sm" onClick={() => { if (confirm(`Take “${w.name}” off the list? Past notes stay.`)) save(true); }}>Remove</button>
                </div>
              </>
            ) : (
              <button type="button" className="mw-kid" onClick={() => setEdit({ id: w.id, name: w.name, description: w.description ?? "" })}>
                <b>{w.name}</b>
                <span className="small muted">{w.description || "Add a description"}</span>
              </button>
            )}
          </li>
        ))}
        <li className="ey-row usual">
          {edit && !edit.id ? (
            <>
              <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={`New ${AREA_NAME[area]} work`} aria-label="Name" />
              <textarea className="input" rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="What the work is and what it builds" aria-label="Description" />
              <div className="row mw-wrap">
                <button type="button" className="btn sm" onClick={() => save()}>Add</button>
                <button type="button" className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <button type="button" className="btn outline sm" onClick={() => setEdit({ name: "", description: "" })}>+ Add a {AREA_NAME[area]} work</button>
          )}
        </li>
      </ul>
    </>
  );
}
