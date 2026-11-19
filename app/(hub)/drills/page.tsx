import Link from "next/link";
import { EDITORS, requireMember } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { currentCampus } from "@/lib/campus-pref";
import { Flash } from "@/components/flash";
import { logDrill, removeDrill } from "./actions";

type Drill = { id: number; campus: string; kind: string; held_on: string; minutes: number | null; headcount: number | null; all_accounted: boolean; went_well: string | null; to_fix: string | null; logged_by: string | null };
const KIND: Record<string, string> = { fire: "Fire", lockdown: "Lockdown", evacuation: "Evacuation", shelter: "Shelter in place", other: "Other" };
const CAMPUS: Record<string, string> = { "maiden-ln": "Maiden Ln", "early-years": "Early Years" };
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const todayNY = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

// Drill log: proof each drill happened, how long it took, and what to fix next time.
export default async function DrillsPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const campus = await currentCampus();
  const { data, error } = await (await createClient()).from("hub_drills").select("*").order("held_on", { ascending: false }).limit(200);
  const drills = (data ?? []) as Drill[];
  const editor = EDITORS.includes(me.role);
  // Last drill of each kind, per campus, so gaps are obvious.
  const last = (c: string, k: string) => drills.find((d) => d.campus === c && d.kind === k)?.held_on;

  return (
    <main className="page stack" style={{ maxWidth: 960 }}>
      <div className="between">
        <div className="stack-sm">
          <h1>Drill log</h1>
          <p className="lede">Log every fire, lockdown, evacuation and shelter-in-place drill right after it ends. Use the class list roll call during the drill.</p>
        </div>
        <Link href="/emergency" className="edit-toggle">Emergency procedures</Link>
      </div>
      <Flash msg={sp.msg} err={sp.err} />
      {error && <p className="notice warn">The drill log isn&apos;t set up yet.</p>}

      <section className="card stack-sm">
        <h2 style={{ fontSize: 17 }}>Last drill of each kind</h2>
        <table className="sheet-table">
          <thead><tr><th>Drill</th>{Object.keys(CAMPUS).map((c) => <th key={c}>{CAMPUS[c]}</th>)}</tr></thead>
          <tbody>
            {["fire", "lockdown", "evacuation", "shelter"].map((k) => (
              <tr key={k}><td><b>{KIND[k]}</b></td>{Object.keys(CAMPUS).map((c) => <td key={c}>{last(c, k) ? day(last(c, k)!) : <span className="review-due">None logged</span>}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack-sm">
        <h2 style={{ fontSize: 17 }}>Log a drill</h2>
        <form action={logDrill} className="stack-sm">
          <div className="drill-grid">
            <label className="field"><span>Campus</span>
              <select name="campus" className="input" defaultValue={campus ?? "maiden-ln"}><option value="maiden-ln">Maiden Ln</option><option value="early-years">Early Years</option></select>
            </label>
            <label className="field"><span>Drill</span>
              <select name="kind" className="input" defaultValue="fire">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label className="field"><span>Date</span><input type="date" name="held_on" className="input" defaultValue={todayNY()} max={todayNY()} required /></label>
            <label className="field"><span>Minutes to all clear</span><input type="number" name="minutes" className="input" min={0} max={240} inputMode="numeric" /></label>
            <label className="field"><span>Students counted</span><input type="number" name="headcount" className="input" min={0} inputMode="numeric" /></label>
            <label className="field"><span>Everyone accounted for?</span>
              <select name="all_accounted" className="input" defaultValue="yes"><option value="yes">Yes</option><option value="no">No, see notes</option></select>
            </label>
          </div>
          <label className="field"><span>What went well</span><textarea name="went_well" className="input" rows={2} /></label>
          <label className="field"><span>What to fix next time</span><textarea name="to_fix" className="input" rows={2} placeholder="e.g. Room 6B didn't hear the announcement" /></label>
          <button type="submit" className="btn" style={{ alignSelf: "flex-start" }}>Log drill</button>
        </form>
      </section>

      <section className="card stack-sm">
        <h2 style={{ fontSize: 17 }}>History</h2>
        {drills.length === 0 ? <p className="small muted">No drills logged yet.</p> : (
          <ul className="ins-needs">
            {drills.map((d) => (
              <li key={d.id}>
                <div className="between" style={{ gap: 8 }}>
                  <b>{KIND[d.kind]} · {CAMPUS[d.campus]}</b>
                  <span className="small muted">{day(d.held_on)}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {d.minutes !== null && <span className="pill">{d.minutes} min</span>}
                  {d.headcount !== null && <span className="pill">{d.headcount} students</span>}
                  <span className={`pill ${d.all_accounted ? "mint" : "amber"}`}>{d.all_accounted ? "All accounted for" : "Not all accounted for"}</span>
                  {d.logged_by && <span className="small muted">by {d.logged_by}</span>}
                </div>
                {d.went_well && <p className="small"><b>Went well:</b> {d.went_well}</p>}
                {d.to_fix && <p className="small"><b>To fix:</b> {d.to_fix}</p>}
                {editor && <form action={removeDrill}><input type="hidden" name="id" value={d.id} /><button type="submit" className="btn ghost sm">Remove</button></form>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
