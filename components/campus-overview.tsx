import Link from "next/link";
import { CAMPUS_LABEL, clock, shortDay, todayNY, type Campus } from "@/lib/campus";
import { getContacts, getProcedures, getWorkshops } from "@/lib/data";
import { OFF_CAMPUS_URL } from "@/lib/links";
import { ExtIcon } from "@/components/external-link";

// Shared summary for a campus page: emergency, trips and workshops for that campus.
export async function CampusOverview({ campus }: { campus: Campus }) {
  const today = todayNY();
  const [contacts, procedures, workshops] = await Promise.all([
    getContacts(campus), getProcedures(campus), getWorkshops(campus, { from: today }),
  ]);

  return (
    <div className="grid">
      <section className="card card-alert" aria-labelledby={`${campus}-em`}>
        <div className="between" style={{ alignItems: "center" }}>
          <h2 id={`${campus}-em`}>Emergency contacts</h2>
          <Link href={`/emergency?campus=${campus}`} className="small">All →</Link>
        </div>
        {contacts.length === 0 && <p className="muted">None added yet.</p>}
        {contacts.slice(0, 5).map((c) => (
          <div key={c.id} className="list-row">
            <span><strong>{c.name}</strong>{c.role && <span className="muted"> · {c.role}</span>}</span>
            {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} style={{ fontWeight: 700 }}>{c.phone}</a>}
          </div>
        ))}
        {procedures.length > 0 && (
          <p className="small">
            Procedures:{" "}
            {procedures.map((p, i) => (
              <span key={p.id}>{i ? ", " : ""}<Link href={`/emergency?campus=${campus}`}>{p.title}</Link></span>
            ))}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby={`${campus}-trips`}>
        <h2 id={`${campus}-trips`}>Off campus</h2>
        <p className="muted">Trips are planned, cleared and checked out on the Off-Campus Today board.</p>
        {OFF_CAMPUS_URL ? (
          <a href={OFF_CAMPUS_URL} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ alignSelf: "flex-start" }}>
            Open off-campus board <ExtIcon />
          </a>
        ) : (
          <span className="pill amber" style={{ alignSelf: "flex-start" }}>Coming soon</span>
        )}
        <p className="small muted">Assembly: South Street Seaport on Fulton St (primary) · Louise Nevelson Plaza (secondary)</p>
      </section>

      <section className="card" aria-labelledby={`${campus}-ws`}>
        <div className="between" style={{ alignItems: "center" }}>
          <h2 id={`${campus}-ws`}>Planning workshops</h2>
          <Link href={`/workshops?campus=${campus}`} className="small">Schedule →</Link>
        </div>
        {workshops.length === 0 && <p className="muted">Nothing scheduled.</p>}
        {workshops.slice(0, 5).map((w) => (
          <div key={w.id} className="list-row">
            <span>{w.topic}{w.campus === "all" ? "" : <span className="muted small"> · {CAMPUS_LABEL[w.campus]}</span>}</span>
            <span className="muted small">{shortDay(w.day)}{w.start_time ? ` · ${clock(w.start_time)}` : ""}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
