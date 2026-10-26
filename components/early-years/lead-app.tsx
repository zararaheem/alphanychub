"use client";

import { useState } from "react";
import { AREA_AGG, AVATAR, CLASSES, LEAD_STUDENTS as STUDENTS } from "@/lib/early-years/sample-data";

type Screen = "overview" | "students" | "classes";

const lastLabel = (d: number) => (d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`);

export function LeadApp() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [cls, setCls] = useState("all");
  const [sort, setSort] = useState<"last" | "az" | "indep">("last");
  const [q, setQ] = useState("");

  const recent = STUDENTS.filter((x) => x.days < 7).length;
  const weekObs = STUDENTS.reduce((t, x) => t + Math.max(0, 6 - x.days), 0);
  const mastered = STUDENTS.reduce((t, x) => t + x.mastered, 0);
  const kpis = [
    { label: "Early Years students", value: String(STUDENTS.length), sub: "WonderLab (Pre-K) · Learning Lab (Kinder)" },
    { label: "Observations this week", value: String(weekObs), sub: "across all classes" },
    { label: "Observed in last 7 days", value: `${Math.round((recent / STUDENTS.length) * 100)}%`, sub: `${STUDENTS.length - recent} students waiting` },
    { label: "Materials mastered", value: String(mastered), sub: "this session" },
  ];
  const stale = STUDENTS.filter((x) => x.days >= 6).sort((a, b) => b.days - a.days).slice(0, 5);
  const classRows = CLASSES.map((c) => {
    const st = STUDENTS.filter((x) => x.cls === c.id);
    const pct = Math.round((st.filter((x) => x.days < 7).length / st.length) * 100);
    return {
      ...c, n: st.length, pct,
      week: st.reduce((t, x) => t + Math.max(0, 6 - x.days), 0),
      avgIndep: (st.reduce((t, x) => t + x.indep, 0) / st.length).toFixed(1),
    };
  });

  const query = q.toLowerCase();
  const list = STUDENTS.filter((x) => (cls === "all" || x.cls === cls) && (!query || x.name.toLowerCase().includes(query)))
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name, undefined, { numeric: true }) : sort === "indep" ? b.indep - a.indep : b.days - a.days));

  const CoverageBar = ({ pct, h = 8 }: { pct: number; h?: number }) => (
    <span aria-hidden="true" style={{ flex: 1, maxWidth: 160, height: h, borderRadius: 999, background: "var(--line-2)", overflow: "hidden", display: "block" }}>
      <span style={{ display: "block", height: "100%", width: `${pct}%`, background: pct >= 80 ? "var(--teal)" : "var(--amber)", borderRadius: 999 }} />
    </span>
  );

  return (
    <main className="page">
      <div className="between" style={{ alignItems: "center" }}>
        <nav aria-label="Lead Guide sections" className="row" style={{ gap: 4 }}>
          {([["overview", "Overview"], ["students", "Students"], ["classes", "Classes"]] as const).map(([v, l]) => (
            <button key={v} type="button" className="chip" aria-pressed={screen === v} onClick={() => setScreen(v)}>{l}</button>
          ))}
        </nav>
        <span className="pill amber" style={{ fontSize: 13, padding: "8px 14px" }}>XP lives in Timeback</span>
      </div>

      <p className="notice" style={{ background: "var(--amber-soft)", color: "var(--amber-ink)", fontWeight: 500 }}>
        Preview with sample students from the mockup. Numbers will be live once rosters and observations are connected.
      </p>

      {screen === "overview" && (
        <>
          <div className="stack-sm">
            <h1>Early Years at a glance</h1>
            <p className="lede">All classes. Progress is tracked here; XP lives in Timeback.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {kpis.map((k) => (
              <div key={k.label} className="card" style={{ padding: 18, gap: 6 }}>
                <span className="small muted" style={{ fontSize: 14 }}>{k.label}</span>
                <span style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{k.value}</span>
                <span className="small" style={{ color: "var(--ink-2)" }}>{k.sub}</span>
              </div>
            ))}
          </div>

          <div className="split">
            <section className="main card" style={{ gap: 14 }} aria-labelledby="agg-h">
              <div className="between" style={{ alignItems: "baseline" }}>
                <h2 id="agg-h">Where students are, by area</h2>
                <span className="small muted">Share of all student × material records</span>
              </div>
              {AREA_AGG.map(([name, i, d, e]) => (
                <div key={name} className="stack-sm">
                  <span className="between" style={{ alignItems: "center" }}><strong style={{ fontWeight: 600 }}>{name}</strong><span style={{ color: "var(--ink-2)" }}>{i}% independent</span></span>
                  <span className="bar" style={{ height: 14 }} aria-label={`${i}% independent, ${d}% developing, ${e}% emerging`} role="img">
                    <span style={{ flex: `${i} 0 0`, background: "#12b5f6" }} />
                    <span style={{ flex: `${d} 0 0`, background: "#4f7cf0" }} />
                    <span style={{ flex: `${e} 0 0`, background: "#8a8fd6" }} />
                  </span>
                </div>
              ))}
              <div className="row small" style={{ gap: 14, color: "var(--ink-2)" }}>
                {[["#12b5f6", "Independent"], ["#4f7cf0", "Developing"], ["#8a8fd6", "Emerging"]].map(([c, l]) => (
                  <span key={l} className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}</span>
                ))}
              </div>
            </section>

            <section className="side card" style={{ gap: 6 }} aria-labelledby="stale-h">
              <h2 id="stale-h" style={{ marginBottom: 6 }}>Not observed in 6+ days</h2>
              {stale.map((s) => (
                <div key={s.name} className="list-row">
                  <span><strong>{s.name}</strong> <span className="muted">· {s.clsName}</span></span>
                  <span style={{ color: "var(--red)", fontWeight: 600 }}>{lastLabel(s.days)}</span>
                </div>
              ))}
              <button type="button" className="btn ghost" style={{ alignSelf: "flex-start", color: "var(--teal)", padding: 0 }} onClick={() => { setSort("last"); setScreen("students"); }}>
                See all students →
              </button>
            </section>
          </div>

          <section className="card" aria-labelledby="cls-h">
            <h2 id="cls-h">Classes</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 640 }}>
                <thead><tr><th scope="col">Class</th><th scope="col">Guides</th><th scope="col">Students</th><th scope="col">Observations this week</th><th scope="col">Observed in last 7 days</th></tr></thead>
                <tbody>
                  {classRows.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong><div className="small muted">{c.sub}</div></td>
                      <td>{c.guide}</td><td>{c.n}</td><td>{c.week}</td>
                      <td><span className="row" style={{ gap: 10, flexWrap: "nowrap" }}><CoverageBar pct={c.pct} /><strong>{c.pct}%</strong></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {screen === "students" && (
        <>
          <div className="between">
            <div className="stack-sm">
              <h1>All Early Years students</h1>
              <p className="lede">{list.length} of {STUDENTS.length} students</p>
            </div>
            <div className="field" style={{ minWidth: 240 }}>
              <label htmlFor="ad-search">Search</label>
              <input id="ad-search" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Student name" />
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {[{ id: "all", name: "All classes" }, ...CLASSES].map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={cls === f.id} onClick={() => setCls(f.id)}>{f.name}</button>
            ))}
            <span aria-hidden="true" style={{ width: 1, height: 28, background: "var(--field)", margin: "0 6px" }} />
            {([["last", "Longest unobserved"], ["az", "A–Z"], ["indep", "Most independent"]] as const).map(([v, l]) => (
              <button key={v} type="button" className="chip" aria-pressed={sort === v} onClick={() => setSort(v)}>{l}</button>
            ))}
          </div>
          <div className="table-box">
            <table style={{ minWidth: 820 }}>
              <thead>
                <tr><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Last observed</th><th scope="col">Observations</th><th scope="col">Independent</th><th scope="col">Mastered</th><th scope="col">Letters</th></tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.name}>
                    <td><span className="row" style={{ gap: 10, flexWrap: "nowrap" }}><span className="avatar" style={{ width: 34, height: 34, fontSize: 14, background: AVATAR[x.i % AVATAR.length] }}>{x.name.replace("Student ", "")}</span><strong>{x.name}</strong></span></td>
                    <td style={{ color: "var(--ink-2)" }}>{x.clsName}</td>
                    <td style={{ color: x.days >= 6 ? "var(--red)" : "var(--ink-2)", fontWeight: x.days >= 6 ? 700 : 400 }}>{lastLabel(x.days)}</td>
                    <td>{x.obs}</td><td>{x.indep}</td><td>{x.mastered}</td><td>{x.letters} / 36</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {screen === "classes" && (
        <>
          <div className="stack-sm">
            <h1>Classes</h1>
            <p className="lede">Observation coverage and progress per classroom.</p>
          </div>
          <div className="grid">
            {classRows.map((c) => (
              <div key={c.id} className="card" style={{ gap: 14 }}>
                <span className="stack-sm"><span className="card-title" style={{ fontSize: 22 }}>{c.name}</span><span className="small muted">{c.sub} · {c.guide}</span></span>
                <span style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  <span className="stat"><b>{c.n}</b><span>students</span></span>
                  <span className="stat"><b>{c.week}</b><span>obs. this week</span></span>
                  <span className="stat"><b>{c.avgIndep}</b><span>avg. independent</span></span>
                </span>
                <span className="stack-sm">
                  <span className="small" style={{ color: "var(--ink-2)" }}>Observed in last 7 days · {c.pct}%</span>
                  <span className="row"><CoverageBar pct={c.pct} h={10} /></span>
                </span>
                <button type="button" className="btn secondary" onClick={() => { setCls(c.id); setScreen("students"); }}>View students</button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
