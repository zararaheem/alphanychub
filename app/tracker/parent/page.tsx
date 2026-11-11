import Link from "next/link";
import { Fragment } from "react";
import { requireTracker } from "@/lib/access";
import { PrintButton } from "@/components/print-button";
import { ParentReportView } from "@/components/early-years/parent-report";
import { addDays, goesBy, mondayOf, nyToday, weekLabel } from "@/lib/montessori";
import { parentReport, type ParentReport } from "@/lib/parent-report";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<{ week?: string; level?: string; all?: string }>;

// Parent reports: pick a child, or print every child's week at once
// (one child per page, so it saves as one PDF to split or send).
export default async function ParentReports({ searchParams }: { searchParams: SP }) {
  await requireTracker();
  const sp = await searchParams;
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : nyToday());
  const level = sp.level === "PK" || sp.level === "K" ? sp.level : null;
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id, first_name, last_name, grade, campus").in("campus", ["early-years", "demo"]);
  // The demo child is listed first but never printed with the class.
  const demo = (data ?? []).filter((k) => k.campus === "demo");
  const kids = (data ?? []).filter((k) => k.campus !== "demo" && (!level || k.grade === level)).sort((a, b) => ((a.grade === "PK" ? 0 : 1) - (b.grade === "PK" ? 0 : 1)) || a.last_name.localeCompare(b.last_name) || goesBy(a).localeCompare(goesBy(b)));
  const q = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ week: monday, ...(level ? { level } : {}) });
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    return `/tracker/parent?${p}`;
  };
  const all = sp.all === "1" ? (await Promise.all(kids.map((k) => parentReport(supabase, k.id, monday)))).filter((r): r is ParentReport => !!r) : [];

  return (
    <main className="wrap stack mw-report">
      <div className="row mw-wrap no-print" style={{ justifyContent: "space-between" }}>
        {sp.all === "1" && <PrintButton label="Print or save all as PDF" />}
      </div>
      <div className="no-print stack">
        <h1>Parent reports</h1>
        <p className="muted">Week of {weekLabel(monday)}. Each report shows the child&apos;s week day by day, where they are in each area, what they can do, and how families can help at home.</p>
        <nav className="row mw-wrap" aria-label="Choose the week">
          <Link className="chip" href={q({ week: addDays(monday, -7) })}>← Previous week</Link>
          {monday !== mondayOf(nyToday()) && <Link className="chip" href={q({ week: addDays(monday, 7) })}>Next week →</Link>}
          <span className="mw-gap" />
          {[["All", null], ["PreK", "PK"], ["K", "K"]].map(([l, v]) => (
            <Link key={l} className="chip" aria-current={level === v ? "page" : undefined} href={q({ level: v })}>{l}</Link>
          ))}
          <span className="mw-gap" />
          <Link className="btn sm outline" href={q({ all: "1" })}>Every child, ready to print</Link>
          <a className="btn sm ghost" href="/samples/wonder-lab-sample-report.pdf" target="_blank" rel="noopener noreferrer">Sample PDF</a>
        </nav>
        {sp.all !== "1" && (
          <ul className="ey-list">
            {demo.map((k) => (
              <li key={k.id} className="ey-row mw-demo-box">
                <span className="ey-name"><b>Demo Child</b> <span className="mw-demo">DEMO</span> <span className="small muted">an example week to show guides</span></span>
                <Link className="ey-step" href={`/tracker/parent/${k.id}?week=${monday}`}>Open example report</Link>
              </li>
            ))}
            {kids.map((k, i) => (
              <Fragment key={k.id}>
                {(i === 0 || kids[i - 1].grade !== k.grade) && <li className="mw-group">{k.grade === "PK" ? "PreK" : "Kindergarten"}</li>}
                <li className="ey-row">
                  <span className="ey-name"><b>{goesBy(k)}</b> <b>{k.last_name}</b></span>
                  <Link className="ey-step" href={`/tracker/parent/${k.id}?week=${monday}`}>Open report</Link>
                </li>
              </Fragment>
            ))}
          </ul>
        )}
      </div>
      {all.map((r) => <div key={r.kid.id} className="pr-page"><ParentReportView r={r} /></div>)}
    </main>
  );
}
