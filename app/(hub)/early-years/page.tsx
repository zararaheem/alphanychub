import Link from "next/link";
import { canSeeLead, requireMember } from "@/lib/access";
import { CampusOverview } from "@/components/campus-overview";

export default async function EarlyYearsPage() {
  const me = await requireMember();
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Early Years</h1>
        <p className="lede">William St · WL (PreK + K)</p>
      </div>

      <section className="stack" aria-labelledby="tools-h">
        <h2 id="tools-h">Program tools</h2>
        <div className="grid">
          <Link href="/early-years/guide" className="card card-link">
            <span className="card-title">Guide tools</span>
            <span className="muted">My classes, class roster, student progress, log an observation, and scan student work.</span>
          </Link>
          {canSeeLead(me.role) && (
            <Link href="/early-years/lead" className="card card-link">
              <span className="card-title">Lead Guide dashboard</span>
              <span className="muted">Early Years at a glance: coverage by class, students not observed in 6+ days, and progress by area.</span>
            </Link>
          )}
        </div>
      </section>

      <CampusOverview campus="early-years" />
    </main>
  );
}
