import Link from "next/link";
import { requireTracker } from "@/lib/access";
import { PrintButton } from "@/components/print-button";
import { CopyText } from "@/components/early-years/copy-text";
import { addDays, mondayOf, nyToday } from "@/lib/montessori";
import { kidName, reportText, weekReport } from "@/lib/montessori-report";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<{ week?: string; level?: string; by?: string }>;

// The weekly one-pager: what the children worked on, the numbers, the
// highlights, and who still needs an observation. Prints on one page.
export default async function WeeklyReport({ searchParams }: { searchParams: SP }) {
  await requireTracker();
  const sp = await searchParams;
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : nyToday());
  const level = sp.level === "PK" || sp.level === "K" ? sp.level : null;
  const r = await weekReport(await createClient(), monday, level, sp.by || null);
  const q = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ week: monday, ...(level ? { level } : {}), ...(r.by ? { by: r.by } : {}) });
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    return `/tracker/report?${p}`;
  };
  const max = Math.max(1, ...r.byArea.map((a) => a.count));
  const guide = r.guides.find((g) => g.email === r.by)?.name;

  return (
    <main className="wrap stack mw-report">
      <div className="row mw-wrap no-print" style={{ justifyContent: "space-between" }}>
        <Link href="/tracker" className="small">← Tracker</Link>
        <div className="row mw-wrap">
          <PrintButton />
          <a className="btn sm outline" href={`/tracker/report/export?${new URLSearchParams({ week: monday, ...(level ? { level } : {}), ...(r.by ? { by: r.by } : {}) })}`} download>Download Excel</a>
          <CopyText text={reportText(r)} />
        </div>
      </div>

      <nav className="row mw-wrap no-print" aria-label="Choose the report">
        <Link className="chip" href={q({ week: addDays(monday, -7) })}>← Previous week</Link>
        {monday !== mondayOf(nyToday()) && <Link className="chip" href={q({ week: addDays(monday, 7) })}>Next week →</Link>}
        <span className="mw-gap" />
        {[["All", null], ["PreK", "PK"], ["K", "K"]].map(([l, v]) => (
          <Link key={l} className="chip" aria-current={level === v ? "page" : undefined} href={q({ level: v })}>{l}</Link>
        ))}
        {r.guides.length > 1 && <>
          <span className="mw-gap" />
          <Link className="chip" aria-current={!r.by ? "page" : undefined} href={q({ by: null })}>All guides</Link>
          {r.guides.map((g) => <Link key={g.email} className="chip" aria-current={r.by === g.email ? "page" : undefined} href={q({ by: g.email })}>{g.name}</Link>)}
        </>}
      </nav>

      <article className="mw-sheet-page">
        <header className="class-list-head">
          <div>
            <span className="kicker">Alpha NYC · Early Years · Wonder Lab</span>
            <h1>Weekly work report</h1>
            <p className="small muted">{r.label}{level ? ` · ${level === "PK" ? "PreK" : "K"}` : ""}{guide ? ` · logged by ${guide}` : ""}</p>
          </div>
        </header>

        <div className="mw-stats">
          <div><b>{r.stats.logged}</b><span>works logged</span></div>
          <div><b>{r.stats.observed}<small>/{r.stats.total}</small></b><span>children observed</span></div>
          <div><b>{r.stats.lessons}</b><span>lessons given</span></div>
          <div><b>{r.stats.independent}</b><span>reached Independent</span></div>
          <div><b>{r.stats.fullCycles}</b><span>full work cycles</span></div>
          <div><b>{r.stats.chose}</b><span>works chosen by the child</span></div>
        </div>

        <section>
          <h2>Work by area</h2>
          <ul className="mw-bars">
            {r.byArea.map((a) => (
              <li key={a.id}><span>{a.name}</span><span className="mw-bar"><i style={{ width: `${(a.count / max) * 100}%` }} /></span><b>{a.count}</b></li>
            ))}
          </ul>
        </section>

        {r.highlights.length > 0 && (
          <section>
            <h2>Highlights</h2>
            <ul className="mw-highlights">
              {r.highlights.map((h, i) => (
                <li key={i}><b>{kidName(h.kid)}</b> · {h.work}{h.level ? ` · ${h.level}` : ""}<br /><span>{h.note}</span> <span className="small muted">({h.day}{h.by ? `, ${h.by}` : ""})</span></li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>Each child</h2>
          <table className="class-table mw-table">
            <thead><tr><th>Child</th><th className="n">Works</th><th>Areas</th><th>Reached Independent</th></tr></thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.kid.id} className={l.count ? undefined : "mw-none"}>
                  <td><b>{kidName(l.kid)}</b> <span className="small muted">{l.kid.grade === "PK" ? "PreK" : l.kid.grade}</span></td>
                  <td className="n">{l.count || "–"}</td>
                  <td className="small">{l.areas.join(", ")}</td>
                  <td className="small">{l.independent.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="small">
          {r.notSeen.length ? <><b>Not observed yet:</b> {r.notSeen.map(kidName).join(", ")}</> : <b>Every child was observed this week.</b>}
        </p>
      </article>
    </main>
  );
}
