import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUSES, CAMPUS_LABEL, clock, shortDay, todayNY } from "@/lib/campus";
import { getContacts, getProcedures, getTrips, getWorkshops } from "@/lib/data";
import { TRIP_STATUS } from "@/lib/types";

export default async function HomePage() {
  const me = await requireMember();
  const today = todayNY();
  const [contacts, procedures, trips, workshops] = await Promise.all([
    getContacts(null), getProcedures(null), getTrips(null, { from: today }), getWorkshops(null, { from: today }),
  ]);
  const outNow = trips.filter((t) => t.status === "out");
  const todays = trips.filter((t) => t.trip_date === today && t.status !== "cancelled");
  const nextWorkshop = workshops[0];

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Hi{me.name ? `, ${me.name.split(" ")[0]}` : ""}</h1>
        <p className="lede">Everything staff need for Maiden Ln and Early Years.</p>
      </div>

      <div className="grid">
        <Link href="/emergency" className="card card-link card-alert">
          <span className="row" style={{ justifyContent: "space-between" }}>
            <span className="card-title">Emergency contact list</span>
            <span className="pill red">Emergency</span>
          </span>
          <span className="muted">Who to call, by campus, plus step-by-step emergency procedures.</span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <span className="stat"><b>{contacts.length}</b><span>contacts</span></span>
            <span className="stat"><b>{procedures.length}</b><span>procedures</span></span>
          </span>
        </Link>

        <Link href="/off-campus" className="card card-link">
          <span className="card-title">Off-campus tracker</span>
          <span className="muted">Log trips, then mark groups out and back so everyone knows who is off campus.</span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <span className={`stat${outNow.length ? " warn" : ""}`}><b>{outNow.length}</b><span>out now</span></span>
            <span className="stat"><b>{todays.length}</b><span>today</span></span>
            <span className="stat"><b>{trips.length}</b><span>upcoming</span></span>
          </span>
        </Link>

        <Link href="/workshops" className="card card-link">
          <span className="card-title">Planning workshops</span>
          <span className="muted">The all-staff workshop schedule and topics.</span>
          {nextWorkshop ? (
            <span className="stat">
              <span>Next up · {shortDay(nextWorkshop.day)}{nextWorkshop.start_time ? ` · ${clock(nextWorkshop.start_time)}` : ""}</span>
              <b style={{ fontSize: 17 }}>{nextWorkshop.topic}</b>
            </span>
          ) : (
            <span className="stat"><span>No upcoming workshops scheduled</span></span>
          )}
        </Link>
      </div>

      {outNow.length > 0 && (
        <section className="card" aria-labelledby="out-h">
          <h2 id="out-h">Off campus right now</h2>
          {outNow.map((t) => (
            <div key={t.id} className="list-row">
              <span><strong>{t.group_name ?? "Group"}</strong> · {t.destination} <span className="muted">· {CAMPUS_LABEL[t.campus]}</span></span>
              <span className="row">
                {t.return_time && <span className="muted">Back by {clock(t.return_time)}</span>}
                <span className={`pill ${TRIP_STATUS[t.status].tone}`}>{TRIP_STATUS[t.status].label}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="stack" aria-labelledby="campus-h">
        <h2 id="campus-h">Campuses</h2>
        <div className="grid">
          {CAMPUSES.map((c) => (
            <Link key={c.id} href={`/${c.id}`} className="card card-link">
              <span className="card-title">{c.name}</span>
              <span className="muted">{c.blurb}</span>
              <span className="small" style={{ color: "var(--teal)", fontWeight: 700 }}>Open campus page →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
