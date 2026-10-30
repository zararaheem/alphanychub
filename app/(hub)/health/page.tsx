import Link from "next/link";
import { canManageStaff, requireMember } from "@/lib/access";
import { currentCampus } from "@/lib/campus-pref";
import { getMedications, getProcedures } from "@/lib/data";
import { FIRST_MOVES, procKind } from "@/lib/procedure-meta";
import { ProcedureBody } from "@/components/procedure-view";
import { MedicationList } from "@/components/medication-list";
import { HEALTH_RULES, INJURY_STEPS } from "@/lib/health";

const SECTIONS = [
  ["hurt", "Someone's hurt"],
  ["emergency", "Medical emergency"],
  ["meds", "Medications"],
  ["rules", "Rules"],
  ["trips", "Trips"],
] as const;

export default async function HealthPage() {
  const me = await requireMember();
  const campus = await currentCampus();
  const [procs, meds] = await Promise.all([getProcedures(campus), getMedications(campus)]);
  const medical = procs.find((p) => procKind(p.title) === "medical");

  return (
    <main className="page health-page">
      <div className="stack-sm">
        <h1>Health &amp; safety</h1>
        <p className="lede">Emergency happening now? <a href="tel:911"><b>Call 911</b></a>, then contact your Campus Coordinator.</p>
      </div>

      {/* Jump to any section; stays on screen while scrolling. */}
      <nav aria-label="Health & safety sections" className="em-switch">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="chip">{label}</a>)}
      </nav>

      <section id="hurt" className="card card-alert h-sec" aria-labelledby="hurt-h">
        <h2 id="hurt-h" className="card-title">If a student gets hurt</h2>
        <ol className="steps big">{INJURY_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
      </section>

      {medical && (
        <section id="emergency" className="card card-alert h-sec" aria-labelledby="emergency-h">
          <div className="section-head">
            <h2 id="emergency-h" className="card-title">Medical emergency: call 911</h2>
            <Link href={`/emergency/${medical.id}`} className="small">Open on its own →</Link>
          </div>
          {FIRST_MOVES.medical && <p className="h-first"><b>First minute:</b> {FIRST_MOVES.medical}</p>}
          <ProcedureBody body={medical.body} skipSummary />
        </section>
      )}

      <section id="meds" className="card h-sec" aria-labelledby="meds-h">
        <div className="section-head">
          <h2 id="meds-h" className="card-title">Student medications</h2>
          <span className="small muted">Staff only</span>
        </div>
        <p className="small muted">Tap a student for when, the dose, how it&apos;s given and where it&apos;s stored. Follow the family&apos;s instructions exactly. Unsure? Ask before giving anything.</p>
        {meds === null ? (
          <p className="empty">Medication records aren&apos;t set up yet.</p>
        ) : (
          <MedicationList rows={meds} manager={canManageStaff(me.role)} />
        )}
      </section>

      <section id="rules" className="card h-sec" aria-labelledby="rules-h">
        <h2 id="rules-h" className="card-title">Rules everyone follows</h2>
        <ul className="rule-list">
          {HEALTH_RULES.map((r) => (
            <li key={r.rule}><b>{r.rule}.</b> <span>{r.detail}</span></li>
          ))}
        </ul>
      </section>

      <section id="trips" className="card h-sec" aria-labelledby="trips-h">
        <h2 id="trips-h" className="card-title">Before a trip or off-site activity</h2>
        <ul className="steps">
          <li>Two adults minimum, plus the student roster.</li>
          <li>First aid bag, and any student meds that are due while you&apos;re out.</li>
          <li>Emergency contacts for every student on the trip (Emergency page).</li>
        </ul>
        <Link href="/guides/checklist" className="btn sm outline" style={{ alignSelf: "flex-start" }}>Before-every-activity checklist →</Link>
      </section>
    </main>
  );
}
