import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { getProcedures } from "@/lib/data";
import { isRespondNow, procKind, shortTitle } from "@/lib/procedure-meta";
import { ProcIcon, ProcedureBody } from "@/components/procedure-view";

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMember();
  const all = await getProcedures(null);
  const p = all.find((x) => String(x.id) === id);
  if (!p) notFound();
  const respond = all.filter(isRespondNow);
  const canEdit = me.role === "admin" || me.role === "lead";
  const kind = procKind(p.title);

  return (
    <main className="page proc-page">
      <Link href="/emergency" className="back-link">← Emergency</Link>

      <header className="proc-head">
        <span className={`proc-icon k-${kind}`}><ProcIcon kind={kind} size={26} /></span>
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="kicker">{isRespondNow(p) ? "Respond now" : "Reference"}{p.campus !== "all" ? ` · ${CAMPUS_LABEL[p.campus]}` : ""}</span>
          <h1>{p.title}</h1>
        </div>
      </header>

      <div className="sos sos-compact">
        <a href="tel:911" className="btn sos-call">Call 911</a>
        <span className="sos-code">Radio (alt: <b>Zello</b>) · Lockdown code <b>&lsquo;Tiger, Tiger&rsquo;</b></span>
      </div>

      <article className="card proc-card">
        <ProcedureBody body={p.body} />
      </article>

      {canEdit && <Link href="/emergency?edit=procedures" className="small muted">Edit procedures</Link>}

      <nav aria-label="Other emergencies" className="stack-sm">
        <span className="label-caps">Other emergencies</span>
        <div className="row" style={{ gap: 8 }}>
          {respond.filter((r) => r.id !== p.id).map((r) => (
            <Link key={r.id} href={`/emergency/${r.id}`} className="chip">{shortTitle(r.title)}</Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
