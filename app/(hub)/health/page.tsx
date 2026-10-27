import Link from "next/link";
import { requireMember } from "@/lib/access";
import { currentCampus } from "@/lib/campus-pref";
import { getProcedures } from "@/lib/data";
import { MEDICATIONS_URL } from "@/lib/links";
import { parseProcedure, procKind } from "@/lib/procedure-meta";
import { ExtIcon } from "@/components/external-link";

export default async function HealthPage() {
  await requireMember();
  const campus = await currentCampus();
  const medical = (await getProcedures(campus)).find((p) => procKind(p.title) === "medical");

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Health &amp; safety</h1>
        <p className="lede">Student medications, what to do in a medical emergency, and what to carry on trips.</p>
      </div>

      <div className="grid">
        <a href={MEDICATIONS_URL} target="_blank" rel="noopener noreferrer" className="card card-link">
          <span className="row" style={{ justifyContent: "space-between" }}>
            <span className="card-title">Student medications</span>
            <span className="pill mint">Open records <ExtIcon /></span>
          </span>
          <span className="muted">Staff-only records for each student who takes medication at school.</span>
          <ol className="steps">
            <li>Search by student name or medication (or open by code, e.g. <code>pack-s1</code>).</li>
            <li>Check the <b>time</b>, <b>dose</b>, <b>how it&apos;s given</b> and <b>where it&apos;s stored</b>.</li>
            <li>Follow the family&apos;s instructions exactly. Unsure? Ask before giving anything.</li>
          </ol>
        </a>

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

      {medical && (
        <section className="card card-alert" aria-labelledby="med-h">
          <h2 id="med-h" className="card-title">{medical.title}</h2>
          {parseProcedure(medical.body).map((b, i) =>
            b.type === "steps" ? <ol key={i} className="steps">{b.items.map((t) => <li key={t}>{t}</li>)}</ol>
            : b.type === "bullets" ? <ul key={i} className="steps">{b.items.map((t) => <li key={t}>{t}</li>)}</ul>
            : b.type === "heading" ? <h3 key={i} className="label-caps">{b.text}</h3>
            : <p key={i}>{b.text}</p>,
          )}
          <Link href="/emergency" className="btn sm" style={{ alignSelf: "flex-start" }}>All emergency procedures and contacts</Link>
        </section>
      )}
    </main>
  );
}
