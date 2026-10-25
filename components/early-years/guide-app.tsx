"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AREAS, AREA_OF, AVATAR, CLASSES, FEED, KIDS, LEVEL, MAT, type Level } from "@/lib/early-years/sample-data";

type Screen = "classes" | "roster" | "student" | "log";
type Scan = { url: string; filter: Filter };
type Filter = "auto" | "bw" | "gray" | "orig";

const FILTERS: Record<Filter, { label: string; css: string }> = {
  auto: { label: "Auto enhance", css: "contrast(1.15) brightness(1.05)" },
  bw: { label: "Black & white", css: "grayscale(1) contrast(1.6)" },
  gray: { label: "Grayscale", css: "grayscale(1)" },
  orig: { label: "Original", css: "none" },
};

const num = (name: string) => name.replace("Student ", "");

function Pill({ level, label }: { level: Level; label?: string }) {
  const l = LEVEL[level];
  return (
    <span className="pill" style={{ background: l.bg, color: l.fg, border: level === "N" ? "1px dashed #B7791F" : undefined }}>
      {label ?? l.label}
    </span>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <legend className="label" style={{ padding: 0, marginBottom: 8 }}>{label}</legend>
      <div className="seg">
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </fieldset>
  );
}

export function GuideApp() {
  const [screen, setScreen] = useState<Screen>("classes");
  const [cls, setCls] = useState("am");
  const [kid, setKid] = useState("Student 1");
  const [sort, setSort] = useState<"due" | "az">("due");
  const [picked, setPicked] = useState<Record<string, boolean>>({ "Student 1": true });
  const [area, setArea] = useState("la");
  const [mat, setMat] = useState("sandlet");
  const [level, setLevel] = useState<"E" | "D" | "I">("D");
  const [cycle, setCycle] = useState<"brief" | "complete">("complete");
  const [support, setSupport] = useState<"self" | "invited" | "lesson">("self");
  const [note, setNote] = useState("");
  const [share, setShare] = useState(true);
  const [toast, setToast] = useState("");
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [scans, setScans] = useState<Scan[]>([]);
  const [filter, setFilter] = useState<Filter>("auto");
  const fileRef = useRef<HTMLInputElement>(null);

  // Free object URLs when scans are dropped or the page unmounts.
  const scansRef = useRef(scans);
  scansRef.current = scans;
  useEffect(() => () => scansRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);

  const go = (s: Screen) => { setScreen(s); setToast(""); window.scrollTo({ top: 0 }); };
  const klass = CLASSES.find((c) => c.id === cls)!;

  const kids = useMemo(() => KIDS.map(([name, week, last, focus], i) => {
    const add = extra[name] ?? 0;
    return { name, week: week + add, last: add ? "Just now" : last, focus, due: !add && /([6-9]) days/.test(last), i };
  }), [extra]);
  const dueCount = kids.filter((k) => k.due).length;
  const added = Object.values(extra).reduce((a, b) => a + b, 0);

  const roster = [...kids];
  if (sort === "due") roster.sort((a, b) => Number(b.due) - Number(a.due) || a.week - b.week);

  const startLog = (names: string[]) => {
    setPicked(Object.fromEntries(names.map((n) => [n, true])));
    setNote("");
    go("log");
  };

  const names = Object.keys(picked);
  const who = names.length ? (names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(" & ")) : "No child selected";
  const summary = `${who} · ${MAT[mat].name} · ${LEVEL[level].label} · ${cycle === "complete" ? "complete cycle" : "brief cycle"}${share ? " · visible to families" : " · private to guides"}`;
  const masteryHint = !!picked["Student 1"] && mat === "food" && level === "I" && cycle === "complete";

  const save = () => {
    if (!names.length) { setToast("Pick at least one child first."); return; }
    setExtra((ex) => { const n = { ...ex }; names.forEach((k) => { n[k] = (n[k] ?? 0) + 1; }); return n; });
    const pages = scans.length ? ` with ${scans.length} scanned page${scans.length > 1 ? "s" : ""}` : "";
    scans.forEach((s) => URL.revokeObjectURL(s.url));
    setScans([]);
    setNote("");
    setScreen("roster");
    setToast(`Saved ${MAT[mat].name} (${LEVEL[level].label}) for ${who}${pages}${share ? ". Families can see it now." : ". Kept private to guides."}`);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((f) => ({ url: URL.createObjectURL(f), filter }));
    setScans((s) => [...s, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const crumbs: { label: string; onClick?: () => void }[] = [{ label: "My classes", onClick: () => go("classes") }];
  if (screen !== "classes") crumbs.push({ label: klass.name, onClick: () => go("roster") });
  if (screen === "student") crumbs.push({ label: kid });
  if (screen === "log") crumbs.push({ label: "New observation" });

  const allMats = AREAS.flatMap((a) => a.mats);

  return (
    <main className="page">
      <div className="between" style={{ alignItems: "center" }}>
        <nav aria-label="Breadcrumb" className="row" style={{ gap: 4 }}>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={c.label} className="row" style={{ gap: 4 }}>
                {i > 0 && <span className="muted" aria-hidden="true">›</span>}
                {last || !c.onClick ? (
                  <span aria-current={last ? "page" : undefined} style={{ fontWeight: 700 }}>{c.label}</span>
                ) : (
                  <button type="button" className="btn ghost sm" style={{ color: "var(--teal)" }} onClick={c.onClick}>{c.label}</button>
                )}
              </span>
            );
          })}
        </nav>
        <button type="button" className="btn amber" onClick={() => startLog(names.length ? names : ["Student 1"])}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Log observation
        </button>
      </div>

      <p className="notice" style={{ background: "#fff4df", color: "var(--amber-ink)", fontWeight: 500 }}>
        Preview with sample students. Observations you log here aren&apos;t saved yet.
      </p>

      {toast && (
        <div role="status" className={`notice${toast.startsWith("Pick") ? " error" : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
          <span>{toast}</span>
        </div>
      )}

      {screen === "classes" && (
        <>
          <div className="stack-sm">
            <h1>My classes</h1>
            <p className="lede">Your classes this session.</p>
          </div>
          <div className="grid">
            {CLASSES.map((c, i) => (
              <button key={c.id} type="button" className="card card-link" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => { setCls(c.id); go("roster"); }}>
                <span className="stack-sm">
                  <span className="card-title">{c.name}</span>
                  <span className="muted small">{c.sub}</span>
                </span>
                <span style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  <span className="stat"><b>{i ? 12 : KIDS.length}</b><span>students</span></span>
                  <span className="stat"><b>{c.week + (i ? 0 : added)}</b><span>observations this week</span></span>
                  <span className="stat warn"><b>{i ? 2 : dueCount}</b><span>need an observation</span></span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {screen === "roster" && (
        <>
          <div className="between">
            <div className="stack-sm">
              <h1>{klass.name}</h1>
              <p className="lede">{klass.sub} · {KIDS.length} students</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {([["due", "Needs observation first"], ["az", "A–Z"]] as const).map(([v, l]) => (
                <button key={v} type="button" className="chip" aria-pressed={sort === v} onClick={() => setSort(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="grid-sm">
            {roster.map((k) => (
              <div key={k.name} className="card" style={{ padding: 16 }}>
                <button type="button" onClick={() => { setKid(k.name); go("student"); }} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, border: 0, background: "transparent", padding: 0, cursor: "pointer" }}>
                  <span className="avatar" style={{ background: AVATAR[k.i % AVATAR.length] }}>{num(k.name)}</span>
                  <span className="stack-sm" style={{ gap: 2 }}>
                    <strong style={{ fontSize: 17 }}>{k.name}</strong>
                    <span className="small" style={{ color: k.due ? "var(--red)" : "var(--muted)" }}>Last observed: {k.last}</span>
                  </span>
                </button>
                <span className="small" style={{ color: "var(--ink-2)" }}>{k.week} {k.week === 1 ? "observation" : "observations"} this week · mostly {k.focus}</span>
                <button type="button" className="btn secondary" onClick={() => startLog([k.name])}>Log for {k.name}</button>
              </div>
            ))}
          </div>
        </>
      )}

      {screen === "student" && (
        <>
          <div className="between" style={{ alignItems: "center" }}>
            <div className="row" style={{ gap: 16 }}>
              <span className="avatar" style={{ width: 64, height: 64, fontSize: 26, background: "var(--teal-mint)", color: "var(--teal-ink)" }}>{num(kid)}</span>
              <div className="stack-sm">
                <h1>{kid}</h1>
                <span className="muted">{klass.name} · {klass.sub}</span>
              </div>
            </div>
            <button type="button" className="btn" onClick={() => startLog([kid])}>Log observation for {kid}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {AREAS.map((a) => {
              const c: Record<Level, number> = { I: 0, D: 0, E: 0, N: 0 };
              a.mats.forEach((m) => { c[m.s]++; });
              const parts = [c.I && `${c.I} Independent`, c.D && `${c.D} Developing`, c.E && `${c.E} Emerging`, c.N && `${c.N} up next`].filter(Boolean);
              return (
                <div key={a.id} className="card" style={{ padding: 16, gap: 10 }}>
                  <strong>{a.name}</strong>
                  <span className="bar" aria-hidden="true">
                    {(["I", "D", "E", "N"] as Level[]).map((k) => c[k] ? <span key={k} style={{ flex: `${c[k]} 0 0`, background: LEVEL[k].bar }} /> : null)}
                  </span>
                  <span className="small" style={{ color: "var(--ink-2)" }}>{parts.join(" · ")}</span>
                </div>
              );
            })}
          </div>
          <div className="split">
            <section className="main card" style={{ gap: 2 }} aria-labelledby="mats-h">
              <h2 id="mats-h" style={{ marginBottom: 8 }}>All materials</h2>
              {allMats.filter((m) => m.s !== "N").map((m) => (
                <div key={m.id} className="list-row" style={{ alignItems: "center" }}>
                  <span className="stack-sm" style={{ gap: 0 }}><strong style={{ fontWeight: 600 }}>{m.name}</strong><span className="small muted">{AREA_OF[m.id].name} · since {m.since}</span></span>
                  <Pill level={m.s} label={m.mastered ? "Mastered ★" : m.confirm ? "Independent · 2 of 3" : undefined} />
                </div>
              ))}
            </section>
            <div className="side stack" style={{ gap: 24 }}>
              <section className="card" aria-labelledby="next-h">
                <h2 id="next-h">Suggested next presentations</h2>
                {allMats.filter((m) => m.s === "N").slice(0, 3).map((m) => (
                  <div key={m.id} style={{ padding: "12px 14px", borderRadius: 12, border: "1px dashed #B7791F", background: "#FFF8EA" }}>
                    <strong>{m.name}</strong> <span className="small" style={{ color: "var(--amber-ink)" }}>· {AREA_OF[m.id].name}</span>
                    <p className="small" style={{ color: "var(--ink-2)", marginTop: 4 }}>{m.purpose}</p>
                  </div>
                ))}
              </section>
              <section className="card" style={{ gap: 4 }} aria-labelledby="feed-h">
                <h2 id="feed-h" style={{ marginBottom: 8 }}>Recent observations</h2>
                {FEED.map((f, i) => (
                  <div key={i} className="list-row" style={{ flexDirection: "column", gap: 4 }}>
                    <span className="between" style={{ alignItems: "center" }}><strong>{MAT[f.m].name}</strong><Pill level={f.s} /></span>
                    <span className="small" style={{ color: "var(--ink-2)" }}>“{f.note}”</span>
                    <span className="small muted">{f.d} · Shared with family</span>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </>
      )}

      {screen === "log" && (
        <>
          <div className="stack-sm">
            <h1>Log an observation</h1>
            <p className="lede">Pick who, what and how it went. Add several children for a group lesson.</p>
          </div>
          <div className="split">
            <div className="main stack" style={{ gap: 20 }}>
              <section className="card">
                <h2 style={{ fontSize: 17 }}>1 · Children</h2>
                <div className="row" style={{ gap: 8 }}>
                  {KIDS.map(([name]) => (
                    <button key={name} type="button" className="chip" aria-pressed={!!picked[name]}
                      style={picked[name] ? { background: "var(--teal)", borderColor: "var(--teal)", color: "#fff" } : undefined}
                      onClick={() => setPicked((p) => { const n = { ...p }; if (n[name]) delete n[name]; else n[name] = true; return n; })}>
                      {name}
                    </button>
                  ))}
                </div>
              </section>
              <section className="card">
                <h2 style={{ fontSize: 17 }}>2 · Material</h2>
                <div className="row" style={{ gap: 8 }}>
                  {AREAS.map((a) => (
                    <button key={a.id} type="button" className="chip" aria-pressed={area === a.id} onClick={() => { setArea(a.id); setMat(a.mats[0].id); }}>{a.name}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
                  {AREAS.find((a) => a.id === area)!.mats.map((m) => (
                    <button key={m.id} type="button" aria-pressed={mat === m.id} onClick={() => setMat(m.id)}
                      style={{ textAlign: "left", minHeight: 52, padding: "0 14px", borderRadius: 12, fontWeight: 600, cursor: "pointer",
                        ...(mat === m.id ? { background: "var(--teal-soft)", border: "2px solid var(--teal)" } : { background: "#fff", border: "1px solid var(--line)", margin: 1 }) }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </section>
              <section className="card" style={{ gap: 16 }}>
                <h2 style={{ fontSize: 17 }}>3 · How it went</h2>
                <Seg label="Level" value={level} onChange={setLevel} options={[["E", "Emerging"], ["D", "Developing"], ["I", "Independent"]]} />
                <Seg label="Work cycle" value={cycle} onChange={setCycle} options={[["brief", "Brief"], ["complete", "Complete"]]} />
                <Seg label="Support" value={support} onChange={setSupport} options={[["self", "Chose it independently"], ["invited", "Guide invited"], ["lesson", "Guide presented a lesson"]]} />
              </section>
            </div>

            <aside className="side card" style={{ gap: 16 }}>
              <h2 style={{ fontSize: 17 }}>4 · Note and scanned work</h2>
              <div className="field">
                <label htmlFor="g-note" className="sr-only">Observation note</label>
                <textarea id="g-note" className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you notice?" />
              </div>

              {scans.length > 0 && (
                <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  {scans.map((p, i) => (
                    <div key={p.url} style={{ width: 104 }} className="stack-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Scanned page ${i + 1}`} style={{ width: 104, height: 134, objectFit: "cover", borderRadius: 6, border: "1px solid var(--field)", filter: FILTERS[p.filter].css }} />
                      <span className="small muted">{FILTERS[p.filter].label}</span>
                      <button type="button" className="btn ghost sm" style={{ color: "var(--red)", padding: 0, justifyContent: "flex-start" }} aria-label={`Remove page ${i + 1}`}
                        onClick={() => { URL.revokeObjectURL(p.url); setScans((s) => s.filter((_, j) => j !== i)); }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <Seg label="Scan filter" value={filter} onChange={setFilter} options={Object.entries(FILTERS).map(([k, v]) => [k as Filter, v.label])} />
              <input ref={fileRef} id="g-scan" type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
              <label htmlFor="g-scan" style={{ minHeight: 90, border: "2px dashed #5FA89C", borderRadius: 12, background: "#F2F8F6", color: "var(--teal-ink)", fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center", padding: 12 }}>
                <span className="row" style={{ gap: 8 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10" /></svg>
                  {scans.length ? "Scan another page" : "Scan work with camera"}
                </span>
                <span className="small" style={{ fontWeight: 500, color: "var(--ink-2)" }}>Opens the camera on a phone or tablet, or pick photos on a computer</span>
              </label>

              <label className="row" style={{ gap: 10, minHeight: 44, cursor: "pointer" }}>
                <input type="checkbox" checked={share} onChange={() => setShare(!share)} style={{ width: 20, height: 20, accentColor: "var(--teal)", margin: 0 }} />
                <span>Share with families</span>
              </label>
              <div style={{ background: "#F2F8F6", borderRadius: 14, padding: 14 }} className="stack-sm">
                <span className="small" style={{ fontWeight: 700, color: "var(--teal-ink)" }}>Summary</span>
                <span>{summary}</span>
                {masteryHint && <span className="small" style={{ color: "var(--teal-ink)" }}>Student 1&apos;s third independent cycle on Food Preparation: this confirms mastery.</span>}
              </div>
              <button type="button" className="btn" style={{ minHeight: 56, fontSize: 18 }} onClick={save}>Save observation</button>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
