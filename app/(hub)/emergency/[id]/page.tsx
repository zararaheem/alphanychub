import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, canEdit } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { getProcedures } from "@/lib/data";
import { FIRST_MOVES, isRespondNow, procKind, shortTitle } from "@/lib/procedure-meta";
import { ProcIcon, ProcedureBody } from "@/components/procedure-view";

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMember();
  const all = await getProcedures(null);
  const p = all.find((x) => String(x.id) === id);
  if (!p) notFound();
  const respond = all.filter(isRespondNow);
  const editable = canEdit(me.role);
  const kind = procKind(p.title);
  const first = FIRST_MOVES[kind];

  return (
    <main className="page proc-page">
      {/* Every emergency one tap away, and it stays on screen while scrolling. */}
      <nav aria-label="Emergencies" className="em-switch">
        <Link href="/emergency" className="chip">← All</Link>
        {respond.map((r) => {
          const k = procKind(r.title);
          return (
            <Link key={r.id} href={`/emergency/${r.id}`} className="chip em-chip" aria-current={r.id === p.id ? "page" : undefined}>
              <ProcIcon kind={k} size={16} /> {shortTitle(r.title)}
            </Link>
          );
        })}
      </nav>

      <header className="proc-head">
        <span className={`proc-icon k-${kind}`}><ProcIcon kind={kind} size={26} /></span>
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="kicker">{isRespondNow(p) ? "Respond now" : "Reference"}{p.campus !== "all" ? ` · ${CAMPUS_LABEL[p.campus]}` : ""}</span>
          <h1>{p.title}</h1>
        </div>
      </header>

      <div className="sos sos-compact">
        <a href="tel:911" className="btn sos-call">Call 911</a>
        <span className="sos-code">Alert everyone by radio (alt: <b>Zello</b>) · Contact your <b>Campus Coordinator</b></span>
      </div>

      {first && (
        <section className="card em-first-card" aria-label="First minute">
          <span className="label-caps">First minute</span>
          <p>{first}</p>
        </section>
      )}

      <article className="card proc-card">
        <span className="label-caps">Step by step</span>
        <ProcedureBody body={p.body} skipSummary />
      </article>

      {editable && <Link href="/emergency?edit=procedures" className="small muted">Edit procedures</Link>}
    </main>
  );
}
