"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AREAS, CYCLE, DOMAINS, LEVEL, LEVELS, SKILL_LEVEL, SKILL_PICK, SUPPORT, goesBy, mondayOf, niceDay, nyToday,
  type AreaId, type Cycle, type Level, type Observation, type Skill, type SkillLevel, type Support, type Work,
} from "@/lib/montessori";
import { deleteObservation, logWork, setLevel, setSkillLevel, updateObservation } from "@/app/tracker/actions";
import { KnowledgeBase } from "@/components/early-years/knowledge-base";
import { TrackerAdmin, type Person } from "@/components/early-years/tracker-admin";

// Montessori work tracker for Early Years guides: pick a child, log the lesson
// they did (level, cycle, support, a note, photos), move the skills it builds,
// and keep the knowledge base (lessons and skills) up to date. Shared by the team.

type Kid = { id: number; first_name: string; last_name: string; grade: string | null; campus?: string };
type Screen = { s: "kids" } | { s: "kid"; id: number; tab: "lessons" | "skills" } | { s: "kb" } | { s: "admin" };
type ClassLevel = "all" | "PK" | "K";
type Draft = {
  kids: number[]; area: AreaId; work: number | null; level: Level | null; cycle: Cycle | null; support: Support | null;
  note: string; highlight: boolean; photos: { path: string; url: string }[]; ocr: string; q: string; strand: string;
};

const GRADE: Record<string, string> = { PK: "PreK", K: "K" };
// The demo child first, then PreK before K, each by last name.
const RANK: Record<string, number> = { PK: 0, K: 1 };
const byClass = (a: { campus?: string; grade: string | null; last_name: string; first_name: string }, b: typeof a) =>
  Number(b.campus === "demo") - Number(a.campus === "demo")
  || (RANK[a.grade ?? ""] ?? 2) - (RANK[b.grade ?? ""] ?? 2)
  || a.last_name.localeCompare(b.last_name) || goesBy(a).localeCompare(goesBy(b));
const DISMISSAL: Record<string, string> = { walker: "walks to Maiden", bus: "bus", parent: "parent pickup", afterschool: "afterschool", early: "early pickup" };

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

export function Pill({ level }: { level: Level }) {
  const l = LEVEL[level];
  return <span className="mw-pill" style={{ background: l.bg, color: l.fg }} title={l.help}>{l.label}</span>;
}
export function Steps({ level }: { level: SkillLevel | undefined }) {
  const n = level ? SKILL_LEVEL[level].step : -1;
  return (
    <span className="mw-steps" aria-label={level ? SKILL_LEVEL[level].label : "Not set"}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : undefined} />)}
    </span>
  );
}

export function WorkApp({ me, admin, people, myClass }: { me: string; admin: boolean; people: Person[]; myClass: "PK" | "K" | null }) {
  const supabase = useMemo(() => createClient(), []);
  const today = nyToday();
  const monday = mondayOf(today);
  const [screen, setScreen] = useState<Screen>({ s: "kids" });
  const [kids, setKids] = useState<Kid[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [links, setLinks] = useState<[number, number][]>([]); // [skill, work]
  const [status, setStatus] = useState<Map<string, Level>>(new Map());
  const [skillStatus, setSkillStatus] = useState<Map<string, SkillLevel>>(new Map());
  const [recent, setRecent] = useState<Observation[]>([]);
  const [history, setHistory] = useState<Observation[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [absent, setAbsent] = useState<Set<number>>(new Set());
  const [dismissal, setDismissal] = useState<Map<number, string>>(new Map());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  // Fixing an entry that's already recorded.
  const [editing, setEditing] = useState<{ id: number; level: Level | null; note: string; highlight: boolean; ocr: string; photos: string[]; added: Record<string, string> } | null>(null);
  const [toast, setToast] = useState("");
  const [cls, setClsState] = useState<ClassLevel>("all");
  const [q, setQ] = useState("");
  const [asGuide, setAsGuideState] = useState(false);
  const isAdmin = admin && !asGuide;

  useEffect(() => {
    try {
      // A guide's own class first; a phone's last choice after that.
      const v = localStorage.getItem("ey:level");
      if (v === "PK" || v === "K" || v === "all") setClsState(v); else if (myClass) setClsState(myClass);
      if (localStorage.getItem("ey:asGuide") === "1") setAsGuideState(true);
    } catch {}
  }, [myClass]);
  const setCls = (v: ClassLevel) => { setClsState(v); try { localStorage.setItem("ey:level", v); } catch {} };
  const setAsGuide = (v: boolean) => { setAsGuideState(v); try { localStorage.setItem("ey:asGuide", v ? "1" : "0"); } catch {} if (v && screen.s === "admin") setScreen({ s: "kids" }); };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    const since = mondayOf(new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
    const [s, att, w, sk, l, st, ss, o] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, grade, campus").in("campus", ["early-years", "demo"]).order("first_name"),
      supabase.from("ey_travel_day").select("student_id, part, mode").eq("day", today),
      supabase.from("ey_works").select("*").order("area").order("sort").order("name"),
      supabase.from("ey_skills").select("*").order("sort"),
      supabase.from("ey_skill_works").select("skill_id, work_id"),
      supabase.from("ey_work_status").select("student_id, work_id, level"),
      supabase.from("ey_skill_status").select("student_id, skill_id, level"),
      supabase.from("ey_observations").select("*").gte("day", since).order("created_at", { ascending: false }),
    ]);
    if (s.error || w.error) { flash("Couldn't load. Check your signal."); return; }
    // The demo child first, then everyone by the name they go by.
    setKids((s.data ?? []).sort(byClass));
    // Today's attendance from EY attendance: absent children are greyed out.
    setAbsent(new Set((att.data ?? []).filter((r) => r.mode === "absent").map((r) => r.student_id)));
    setDismissal(new Map((att.data ?? []).filter((r) => r.part === "pm").map((r) => [r.student_id, r.mode])));
    setWorks((w.data ?? []) as Work[]);
    setSkills((sk.data ?? []) as Skill[]);
    setLinks((l.data ?? []).map((r) => [r.skill_id, r.work_id] as [number, number]));
    setStatus(new Map((st.data ?? []).map((r) => [`${r.student_id}:${r.work_id}`, r.level as Level])));
    setSkillStatus(new Map((ss.data ?? []).map((r) => [`${r.student_id}:${r.skill_id}`, r.level as SkillLevel])));
    setRecent((o.data ?? []) as Observation[]);
    setLoaded(true);
  }, [supabase, today]);

  const loadHistory = useCallback(async (id: number) => {
    const { data } = await supabase.from("ey_observations").select("*").eq("student_id", id).order("day", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    const rows = (data ?? []) as Observation[];
    setHistory(rows);
    // Private photos: short-lived links, only for people the bucket lets in.
    const paths = rows.flatMap((o) => o.photos ?? []);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("ey-work").createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((signed ?? []).flatMap((x) => (x.path && x.signedUrl ? [[x.path, x.signedUrl]] : []))));
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  const kidScreenId = screen.s === "kid" ? screen.id : null;
  useEffect(() => { if (kidScreenId) loadHistory(kidScreenId); }, [kidScreenId, loadHistory]);

  const workOf = new Map(works.map((w) => [w.id, w]));
  const skillOf = new Map(skills.map((s) => [s.id, s]));
  const kidOf = new Map(kids.map((k) => [k.id, k]));
  const skillsFor = (workId: number) => links.filter(([, w]) => w === workId).map(([s]) => skillOf.get(s)).filter((s): s is Skill => !!s && !s.archived);
  const lessonsFor = (skillId: number) => links.filter(([s]) => s === skillId).map(([, w]) => workOf.get(w)).filter((w): w is Work => !!w && !w.archived);
  const demoKids = kids.filter((k) => k.campus === "demo");
  const realKids = kids.filter((k) => k.campus !== "demo");
  const shown = realKids
    .filter((k) => cls === "all" || k.grade === cls)
    .filter((k) => !q || `${k.first_name} ${k.last_name}`.toLowerCase().includes(q.toLowerCase()));
  const thisWeek = recent.filter((o) => o.day >= monday);
  const weekCount = (id: number) => thisWeek.filter((o) => o.student_id === id).length;
  const lastSeen = (id: number) => recent.find((o) => o.student_id === id)?.day;
  const name = (k: Kid) => <><b>{goesBy(k)}</b> <b>{k.last_name}</b>{k.campus === "demo" && <span className="mw-demo">DEMO</span>}{k.grade && <span className="ey-grade">{GRADE[k.grade] ?? k.grade}</span>}</>;

  function openLog(kidId: number, workId: number | null = null) {
    const w = workId ? workOf.get(workId) : null;
    setDraft({ kids: [kidId], area: w?.area ?? "pl", work: workId, level: workId ? status.get(`${kidId}:${workId}`) ?? null : null, cycle: null, support: null, note: "", highlight: false, photos: [], ocr: "", q: "", strand: "" });
  }

  async function upload(files: FileList, room: number): Promise<{ path: string; url: string }[]> {
    const out: { path: string; url: string }[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const blob = await shrink(f);
      const ext = blob.type === "image/jpeg" ? "jpg" : f.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${today.slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("ey-work").upload(path, blob, { contentType: blob.type || f.type });
      if (error) { flash("A photo didn't upload."); continue; }
      out.push({ path, url: URL.createObjectURL(blob) });
    }
    return out;
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const r = await updateObservation(editing.id, { level: editing.level, note: editing.note, highlight: editing.highlight, ocrText: editing.ocr, photos: editing.photos });
    setSaving(false);
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash("Updated");
    setEditing(null);
    await load();
    if (screen.s === "kid") loadHistory(screen.id);
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
    if (!draft || !draft.kids.length) return;
    setSaving(true);
    const r = await logWork({ studentIds: draft.kids, workId: draft.work, level: draft.work ? draft.level : null, cycle: draft.cycle, support: draft.support, note: draft.note, highlight: draft.highlight, photos: draft.photos.map((p) => p.path), ocrText: draft.ocr });
    setSaving(false);
    if (!r.ok) { flash(r.error ?? "That didn't save."); return; }
    flash(draft.kids.length > 1 ? `Logged for ${draft.kids.length} children` : "Logged");
    setDraft(null);
    await load();
    if (screen.s === "kid") loadHistory(screen.id);
  }

  async function moveSkill(ids: number[], skillId: number, level: SkillLevel) {
    setSkillStatus((m) => { const n = new Map(m); ids.forEach((id) => n.set(`${id}:${skillId}`, level)); return n; });
    const r = await setSkillLevel(ids, skillId, level);
    if (!r.ok) { flash("That didn't save."); load(); }
  }

  const skillSeg = (ids: number[], s: Skill) => {
    const cur = ids.length === 1 ? skillStatus.get(`${ids[0]}:${s.id}`) : undefined;
    return (
      <div className="seg mw-seg-sm" role="group" aria-label={`${s.name} level`}>
        {SKILL_PICK.map((l) => (
          <button key={l} type="button" aria-pressed={cur === l} title={`${SKILL_LEVEL[l].help}${cur === l ? " Tap again to clear." : ""}`} onClick={() => moveSkill(ids, s.id, cur === l ? "U" : l)}>{SKILL_LEVEL[l].label}</button>
        ))}
      </div>
    );
  };

  // ------------------------------------------------------------ log sheet
  let sheet: React.ReactNode = null;
  if (draft) {
    const term = draft.q.trim().toLowerCase();
    const live = works.filter((w) => !w.archived);
    // Matches every word typed, anywhere in the name, strand, aim or what to look for; names first.
    const words = term.split(/\s+/).filter(Boolean);
    const score = (w: Work) => {
      const nameHay = w.name.toLowerCase();
      const hay = `${nameHay} ${w.strand ?? ""} ${w.direct_aim ?? ""} ${w.indirect_aims ?? ""} ${w.evidence ?? ""}`.toLowerCase();
      if (!words.every((x) => hay.includes(x))) return 0;
      return words.reduce((n, x) => n + (nameHay.startsWith(x) ? 4 : nameHay.includes(x) ? 2 : 1), 0);
    };
    const matches = term ? live.map((w) => [w, score(w)] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([w]) => w) : [];
    const inArea = live.filter((w) => w.area === draft.area);
    const strands = [...new Set(inArea.map((w) => w.strand).filter((x): x is string => !!x))];
    const browse = inArea.filter((w) => !draft.strand || w.strand === draft.strand);
    const pick = (w: Work) => {
      const lv = draft.kids.length === 1 ? status.get(`${draft.kids[0]}:${w.id}`) : undefined;
      setDraft({ ...draft, work: w.id, area: w.area, q: "", level: lv ?? draft.level });
    };
    const chosen = draft.work ? workOf.get(draft.work) : undefined;
    const builds = chosen ? skillsFor(chosen.id) : [];
    sheet = (
      <div className="mw-sheet" role="dialog" aria-label="Record a lesson or moment">
        <div className="mw-sheet-in stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>Record a lesson or moment</h2>
            <button type="button" className="btn ghost sm" onClick={() => setDraft(null)}>Close</button>
          </div>

          <div className="stack-sm">
            <span className="label">Children</span>
            <div className="row mw-wrap">
              {kids.filter((k) => cls === "all" || k.grade === cls || draft.kids.includes(k.id)).map((k) => (
                <button key={k.id} type="button" className="chip" aria-pressed={draft.kids.includes(k.id)}
                  onClick={() => setDraft({ ...draft, kids: draft.kids.includes(k.id) ? draft.kids.filter((x) => x !== k.id) : [...draft.kids, k.id] })}>
                  {goesBy(k)} {k.last_name[0]}.
                </button>
              ))}
            </div>
            <span className="small muted">Tap more children to record a group lesson for each of them.</span>
          </div>

          <div className="stack-sm">
            <span className="label">Lesson <span className="muted">(skip it to record just a moment)</span></span>
            {chosen ? (
              <div className="mw-chosen">
                <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
                  <b>{chosen.name}</b>
                  <button type="button" className="btn ghost sm" onClick={() => setDraft({ ...draft, work: null })}>Change</button>
                </div>
                <span className="small muted">{AREAS.find((a) => a.id === chosen.area)?.name}{chosen.strand ? ` · ${chosen.strand}` : ""}</span>
                {chosen.direct_aim && <p className="small"><b>Aim:</b> {chosen.direct_aim}</p>}
                {chosen.evidence && <p className="small"><b>Look for:</b> {chosen.evidence}</p>}
              </div>
            ) : (
              <>
                <input className="input" autoFocus placeholder="Start typing: pouring, pink tower, letters, counting…" value={draft.q}
                  onChange={(e) => setDraft({ ...draft, q: e.target.value })} aria-label="Search lessons" />
                {term && (
                  <ul className="mw-suggest" role="listbox" aria-label="Matching lessons">
                    {matches.slice(0, 8).map((w) => {
                      const lv = draft.kids.length === 1 ? status.get(`${draft.kids[0]}:${w.id}`) : undefined;
                      return (
                        <li key={w.id}>
                          <button type="button" role="option" aria-selected={false} onClick={() => pick(w)}>
                            <b>{w.name}</b>
                            <span className="small muted">{AREAS.find((a) => a.id === w.area)?.name}{w.strand ? ` · ${w.strand}` : ""}{lv ? ` · ${LEVEL[lv].label}` : ""}</span>
                          </button>
                        </li>
                      );
                    })}
                    {!matches.length && <li className="small muted" style={{ padding: 10 }}>No lesson matches. Try another word, or add it in Knowledge base.</li>}
                  </ul>
                )}
                {!term && (
                  <div className="mw-browse">
                    <span className="small muted">Or browse:</span>
                    <select className="input" aria-label="Area" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as AreaId, strand: "" })}>
                      {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select className="input" aria-label="Strand" value={draft.strand} onChange={(e) => setDraft({ ...draft, strand: e.target.value })}>
                      <option value="">All {AREAS.find((a) => a.id === draft.area)?.name}</option>
                      {strands.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <select className="input" aria-label="Lesson" value="" onChange={(e) => { const w = workOf.get(Number(e.target.value)); if (w) pick(w); }}>
                      <option value="" disabled>Choose a lesson ({browse.length})</option>
                      {browse.map((w) => {
                        const lv = draft.kids.length === 1 ? status.get(`${draft.kids[0]}:${w.id}`) : undefined;
                        return <option key={w.id} value={w.id}>{w.name}{lv ? ` · ${LEVEL[lv].label}` : ""}</option>;
                      })}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="stack-sm">
            <span className="label">Where they are with this lesson</span>
            <div className="seg">
              {LEVELS.map((l) => <button key={l} type="button" aria-pressed={draft.level === l} title={LEVEL[l].help} onClick={() => setDraft({ ...draft, level: l })}>{LEVEL[l].label}</button>)}
            </div>
            {draft.level && <span className="small muted">{LEVEL[draft.level].help}</span>}
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

          {builds.length > 0 && (
            <div className="stack-sm">
              <span className="label">Skills this lesson builds</span>
              <span className="small muted">Move a skill if today showed something new. It saves straight away.</span>
              {builds.map((s) => (
                <div key={s.id} className="mw-skill-row">
                  <span className="small"><b>{s.name}</b> <span className="muted">{s.code}</span></span>
                  {skillSeg(draft.kids, s)}
                </div>
              ))}
            </div>
          )}

          <label className="stack-sm">
            <span className="label">What you saw</span>
            <textarea className="input" rows={3} value={draft.note} placeholder="e.g. Built rods 1–6 in order and counted each one; asked for help with 7–10."
              onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>

          <div className="stack-sm">
            <span className="label">Evidence: photos or scans</span>
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
            <span><b>Standout moment</b>: feature this in the weekly report and the family&apos;s report</span>
          </label>
          <button type="button" className="btn" disabled={!draft.kids.length || saving || !!busy || (!draft.work && !draft.note.trim() && !draft.ocr.trim() && !draft.photos.length)} onClick={save}>
            {saving ? "Saving…" : draft.kids.length > 1 ? `Save for ${draft.kids.length} children` : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ screens
  const tabs: [string, Screen["s"], (() => void) | string][] = [
    ["Students", "kids", () => setScreen({ s: "kids" })],
    ["Knowledge base", "kb", () => setScreen({ s: "kb" })],
    ...(isAdmin ? [["Admin", "admin", () => setScreen({ s: "admin" })] as [string, Screen["s"], () => void]] : []),
  ];
  const top = (
    <div className="ey-top">
      <div>
        <span className="kicker">Early Years · Wonder Lab</span>
        <h1>{screen.s === "kb" ? "Knowledge base" : screen.s === "admin" ? "Admin" : screen.s === "kid" ? "Student" : "Students"}</h1>
        <p className="small muted">Week of {niceDay(monday, { month: "long", day: "numeric" })}</p>
      </div>
      <nav className="seg-links mw-tabs" aria-label="Tracker">
        {tabs.map(([label, s, go]) => typeof go === "string"
          ? <a key={label} href={go}>{label}</a>
          : <a key={label} href={`#${s}`} aria-current={(screen.s === s || (s === "kids" && screen.s === "kid")) && typeof go !== "string" ? "page" : undefined} onClick={(e) => { e.preventDefault(); go(); }}>{label}</a>)}
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
                {v === "all" ? `All · ${realKids.length}` : `${GRADE[v]} · ${realKids.filter((k) => k.grade === v).length}`}
              </a>
            ))}
          </div>
          <input className="input mw-search" placeholder="Find a child" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {demoKids.map((k) => (
          <div key={k.id} className="mw-demo-box">
            <div className="ey-who">
              <span className="ey-name"><b>Demo Child</b> <span className="mw-demo">DEMO</span></span>
              <span className="small muted">A practice child with an example week. Try recording here; it never appears in class lists, attendance or reports.</span>
            </div>
            <div className="row mw-wrap">
              <button type="button" className="btn ghost sm" onClick={() => setScreen({ s: "kid", id: k.id, tab: "lessons" })}>Open</button>
              <a className="btn ghost sm" href={`/tracker/parent/${k.id}`}>Example report</a>
              <button type="button" className="ey-step" onClick={() => openLog(k.id)}>+ Record</button>
            </div>
          </div>
        ))}
        <div className={`roll-bar${seen === shown.length ? " done" : ""}`} role="status">
          <span><b>{seen}</b> of {shown.length} observed this week · {thisWeek.filter((o) => shown.some((k) => k.id === o.student_id)).length} lessons recorded</span>
        </div>
        <ul className="ey-list">
          {shown.map((k, i) => {
            const n = weekCount(k.id);
            const heading = (i === 0 || shown[i - 1].grade !== k.grade) && cls === "all" && !q;
            const last = lastSeen(k.id);
            const mastered = works.filter((w) => status.get(`${k.id}:${w.id}`) === "M").length;
            return (
              <Fragment key={k.id}>
              {heading && <li className="mw-group">{k.grade === "PK" ? "PreK" : k.grade === "K" ? "Kindergarten" : "Other"}</li>}
              <li className={`ey-row${absent.has(k.id) ? " absent" : n === 0 ? " changed" : ""}`}>
                <button type="button" className="mw-kid" onClick={() => setScreen({ s: "kid", id: k.id, tab: "lessons" })}>
                  <span className="ey-name">{name(k)}</span>
                  <span className="small muted">{absent.has(k.id) ? "Absent today · " : dismissal.get(k.id) ? `Today: ${DISMISSAL[dismissal.get(k.id)!] ?? dismissal.get(k.id)} · ` : ""}{n ? `${n} this week` : "Not observed this week"}{last ? ` · last ${last === today ? "today" : niceDay(last)}` : ""}{mastered ? ` · ${mastered} mastered` : ""}</span>
                </button>
                <button type="button" className="ey-step" onClick={() => openLog(k.id)}>+ Record</button>
              </li>
              </Fragment>
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
          <div className="row mw-wrap">
            <a className="btn outline sm" href={`/tracker/parent/${k.id}`}>Parent report</a>
            <button type="button" className="btn sm" onClick={() => openLog(k.id)}>+ Record a lesson</button>
          </div>
        </div>
        <h2 className="ey-name" style={{ fontSize: 22 }}>{name(k)}</h2>

        <section className="ey-sec">
          <h2>Recent work</h2>
          {history.length === 0 ? <p className="small muted">Nothing logged yet. Tap “Record a lesson”.</p> : (
            <ul className="mw-feed">
              {history.slice(0, 8).map((o) => (
                <li key={o.id}>
                  <div className="row mw-wrap" style={{ gap: 8 }}>
                    <b>{o.work_id ? workOf.get(o.work_id)?.name ?? "Lesson" : "Moment"}</b>
                    {o.level && <Pill level={o.level} />}
                    {o.highlight && <span className="mw-star" title="Standout moment">★ Standout</span>}
                    <span className="small muted">{niceDay(o.day)} · {o.by_name}</span>
                  </div>
                  {editing?.id === o.id ? (
                    <div className="stack-sm mw-form">
                      {o.work_id && (
                        <div className="seg mw-seg-sm" role="group" aria-label="Level">
                          {LEVELS.map((l) => <button key={l} type="button" aria-pressed={editing.level === l} onClick={() => setEditing({ ...editing, level: l })}>{LEVEL[l].label}</button>)}
                        </div>
                      )}
                      <textarea className="input" rows={3} value={editing.note} placeholder="What you saw" onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
                      {editing.photos.length > 0 && (
                        <div className="mw-photos">
                          {editing.photos.map((p) => (
                            <figure key={p}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={editing.added[p] ?? urls[p]} alt="Work photo" />
                              <button type="button" className="btn ghost sm" onClick={() => setEditing({ ...editing, photos: editing.photos.filter((x) => x !== p) })}>Remove</button>
                            </figure>
                          ))}
                        </div>
                      )}
                      <label className="btn outline sm mw-upload">
                        Add a photo
                        <input type="file" accept="image/*" capture="environment" multiple hidden onChange={async (e) => {
                          const files = e.target.files; e.target.value = "";
                          if (!files?.length) return;
                          setBusy("Uploading…");
                          const added = await upload(files, 8 - editing.photos.length);
                          setBusy("");
                          setEditing((ed) => ed ? { ...ed, photos: [...ed.photos, ...added.map((a) => a.path)], added: { ...ed.added, ...Object.fromEntries(added.map((a) => [a.path, a.url])) } } : ed);
                        }} />
                      </label>
                      <textarea className="input" rows={2} value={editing.ocr} placeholder="Writing in the work" onChange={(e) => setEditing({ ...editing, ocr: e.target.value })} />
                      <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={editing.highlight} onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })} /> Standout moment</label>
                      {busy && <span className="small muted">{busy}</span>}
                      <div className="row mw-wrap">
                        <button type="button" className="btn sm" disabled={saving || !!busy} onClick={saveEdit}>{saving ? "Saving…" : "Save changes"}</button>
                        <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                      <span className="small muted">Removed photos are deleted when you save.</span>
                    </div>
                  ) : <>
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
                  <div className="row mw-wrap mw-del">
                    <button type="button" className="btn ghost sm" onClick={() => setEditing({ id: o.id, level: o.level, note: o.note ?? "", highlight: o.highlight, ocr: o.ocr_text ?? "", photos: o.photos ?? [], added: {} })}>Edit</button>
                    <button type="button" className="btn ghost sm" onClick={async () => { if (confirm("Delete this entry?")) { await deleteObservation(o.id); loadHistory(k.id); load(); } }}>Delete</button>
                  </div>
                  </>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className="seg-links" aria-label="Lessons or skills">
          <a href="#lessons" aria-current={screen.tab === "lessons" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setScreen({ ...screen, tab: "lessons" }); }}>Lessons</a>
          <a href="#skills" aria-current={screen.tab === "skills" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setScreen({ ...screen, tab: "skills" }); }}>Skills</a>
        </nav>

        {screen.tab === "lessons" ? AREAS.map((a) => {
          const list = works.filter((w) => w.area === a.id && !w.archived);
          const started = list.filter((w) => status.get(`${k.id}:${w.id}`));
          const rest = list.filter((w) => !status.get(`${k.id}:${w.id}`));
          const row = (w: Work) => {
            const lv = status.get(`${k.id}:${w.id}`);
            return (
              <li key={w.id} className="ey-row">
                <div className="ey-who">
                  <span>{w.name}</span>
                  <span className="small muted">{w.strand}</span>
                </div>
                <div className="ey-steps">
                  <select className="input mw-level" aria-label={`${w.name} level`} value={lv ?? ""}
                    onChange={async (e) => {
                      const v = e.target.value as Level;
                      setStatus((m) => new Map(m).set(`${k.id}:${w.id}`, v));
                      const r = await setLevel(k.id, w.id, v);
                      if (!r.ok) { flash("That didn't save."); load(); }
                    }}>
                    <option value="" disabled>Not started</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL[l].label}</option>)}
                  </select>
                  <button type="button" className="ey-step" onClick={() => openLog(k.id, w.id)}>Record</button>
                </div>
              </li>
            );
          };
          return (
            <section key={a.id} className="ey-sec">
              <h2>{a.name} <span className="muted">· {started.filter((w) => status.get(`${k.id}:${w.id}`) === "M").length} mastered of {list.length}</span></h2>
              <ul className="ey-list">{started.map(row)}</ul>
              <details className="mw-more">
                <summary className="small">Not started yet · {rest.length}</summary>
                <ul className="ey-list">{rest.map(row)}</ul>
              </details>
            </section>
          );
        }) : DOMAINS.map((d) => {
          const list = skills.filter((s) => s.domain === d.id && !s.archived);
          return (
            <section key={d.id} className="ey-sec">
              <h2>{d.name}</h2>
              <ul className="ey-list">
                {list.map((s) => {
                  const lv = skillStatus.get(`${k.id}:${s.id}`);
                  return (
                    <li key={s.id} className="ey-row usual">
                      <div className="row mw-wrap" style={{ justifyContent: "space-between" }}>
                        <span><b>{s.name}</b> <span className="small muted">{s.code}</span></span>
                        <Steps level={lv} />
                      </div>
                      {s.ican && <span className="small muted">“{s.ican}”</span>}
                      {skillSeg([k.id], s)}
                      <span className="small muted">Built by: {lessonsFor(s.id).map((w) => {
                        const wl = status.get(`${k.id}:${w.id}`);
                        return `${w.name}${wl ? ` (${LEVEL[wl].label})` : ""}`;
                      }).join(" · ") || "no lessons linked"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </>
    );
  } else if (loaded && screen.s === "kb") {
    body = <KnowledgeBase works={works} skills={skills} links={links} onSaved={load} flash={flash} />;
  } else if (loaded && screen.s === "admin" && isAdmin) {
    body = <TrackerAdmin people={people} flash={flash} />;
  }

  return (
    <main className="wrap stack ey mw">
      {admin && (
        <div className={`mw-viewbar${asGuide ? " on" : ""}`}>
          <span className="small">{asGuide ? "Viewing as a guide sees it." : "Superadmin view."}</span>
          <button type="button" className="btn ghost sm" onClick={() => setAsGuide(!asGuide)}>{asGuide ? "Back to superadmin" : "View as guide"}</button>
        </div>
      )}
      {top}
      {body}
      {sheet}
      <p className="small muted">Signed in as {me}. Everyone on the Early Years team sees the same notes.</p>
      {toast && <div className="ey-toast" role="status">{toast}</div>}
    </main>
  );
}
