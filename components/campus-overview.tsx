import Link from "next/link";
import { CAMPUS_LABEL, clock, shortDay, todayNY, type Campus } from "@/lib/campus";
import { getContacts, getProcedures, getTrips, getWorkshops } from "@/lib/data";
import { TRIP_STATUS } from "@/lib/types";

// Shared summary for a campus page: emergency, trips and workshops for that campus.
export async function CampusOverview({ campus }: { campus: Campus }) {
  const today = todayNY();
  const [contacts, procedures, trips, workshops] = await Promise.all([
    getContacts(campus), getProcedures(campus), getTrips(campus, { from: today }), getWorkshops(campus, { from: today }),
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
        <div className="between" style={{ alignItems: "center" }}>
          <h2 id={`${campus}-trips`}>Off-campus trips</h2>
          <Link href={`/off-campus?campus=${campus}`} className="small">Tracker →</Link>
        </div>
        {trips.length === 0 && <p className="muted">No upcoming trips.</p>}
        {trips.slice(0, 5).map((t) => (
          <div key={t.id} className="list-row">
            <span>
              <strong>{t.destination}</strong>
              <span className="muted small"> · {t.trip_date === today ? "Today" : shortDay(t.trip_date)}{t.depart_time ? ` ${clock(t.depart_time)}` : ""}</span>
            </span>
            <span className={`pill ${TRIP_STATUS[t.status].tone}`}>{TRIP_STATUS[t.status].label}</span>
          </div>
        ))}
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
