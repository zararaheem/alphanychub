import Link from "next/link";
import { canManageStaff, requireMember } from "@/lib/access";
import { currentCampus } from "@/lib/campus-pref";
import { getMedications, getProcedures } from "@/lib/data";
import { parseProcedure, procKind } from "@/lib/procedure-meta";
import { MedicationList } from "@/components/medication-list";
import { HEALTH_RULES, INJURY_STEPS } from "@/lib/health";

export default async function HealthPage() {
  const me = await requireMember();
  const campus = await currentCampus();
  const [procs, meds] = await Promise.all([getProcedures(campus), getMedications(campus)]);
  const medical = procs.find((p) => procKind(p.title) === "medical");

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Health &amp; safety</h1>
        <p className="lede">Student medications, what to do in a medical emergency, and what to carry on trips. All in one place.</p>
      </div>

      <section className="card card-alert" aria-labelledby="injury-h">
        <h2 id="injury-h" className="card-title">If a student gets injured</h2>
        <ol className="steps big">{INJURY_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
      </section>

      <section className="card" aria-labelledby="rules-h">
        <h2 id="rules-h" className="card-title">Rules everyone follows</h2>
        <ul className="rule-list">
          {HEALTH_RULES.map((r) => (
            <li key={r.rule}><b>{r.rule}.</b> <span>{r.detail}</span></li>
          ))}
        </ul>
        <p className="small muted">Emergency happening now? Call 911 first, then contact your Campus Coordinator.</p>
      </section>

      <div className="grid">

        <section className="card">
          <span className="card-title">Before a trip or off-site activity</span>
          <ul className="steps">
            <li>Two adults minimum, plus the student roster.</li>
            <li>First aid bag, and any student meds that are due while you&apos;re out.</li>
            <li>Emergency contacts for every student on the trip (Emergency page).</li>
          </ul>
          <Link href="/guides/checklist" className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Before-every-activity checklist</Link>
        </section>
      </div>

      <section className="card" aria-labelledby="meds-h">
        <div className="section-head">
          <h2 id="meds-h" className="card-title">Student medications</h2>
          <span className="small muted">Staff only</span>
        </div>
        <p className="small muted">Open a student to see when, the dose, how it&apos;s given and where it&apos;s stored. Follow the family&apos;s instructions exactly; unsure? Ask before giving anything.</p>
        {meds === null ? (
          <p className="empty">Medication records aren&apos;t set up yet. An admin needs to run the latest database update.</p>
        ) : (
          <MedicationList rows={meds} manager={canManageStaff(me.role)} />
        )}
      </section>

      {medical && (
        <section className="card card-alert wrap" aria-labelledby="med-h">
          <h2 id="med-h" className="card-title">{medical.title}</h2>
          {parseProcedure(medical.body).map((b, i) =>
            b.type === "steps" ? <ol key={i} className="steps">{b.items.map((t) => <li key={t}>{t}</li>)}</ol>
            : b.type === "bullets" ? <ul key={i} className="steps">{b.items.map((t) => <li key={t}>{t}</li>)}</ul>
            : b.type === "heading" ? <h3 key={i} className="label-caps">{b.text}</h3>
            : <p key={i} className="wrap">{boldLabel(b.text)}</p>,
          )}
          <Link href="/emergency" className="btn sm" style={{ alignSelf: "flex-start" }}>All emergency procedures and contacts</Link>
        </section>
      )}
    </main>
  );
}

// "First aid kits: …" / "AED: …" → bold label, so the kit and AED lines stand out.
function boldLabel(text: string) {
  const m = text.match(/^([^:]{2,30}):\s*(.*)$/);
  return m ? <><b>{m[1]}:</b> {m[2]}</> : text;
}
