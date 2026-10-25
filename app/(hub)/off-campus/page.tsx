import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL, clock, parseCampus, shortDay, todayNY } from "@/lib/campus";
import { getTrips } from "@/lib/data";
import { deleteTrip, saveTrip, setTripStatus } from "@/lib/actions";
import { CampusFilter } from "@/components/campus-filter";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import { TRIP_STATUS, type Trip, type TripStatus } from "@/lib/types";

type SP = Promise<{ campus?: string; past?: string; msg?: string; err?: string }>;

// What a staff member can move a trip to next.
const NEXT: Record<TripStatus, TripStatus[]> = {
  planned: ["approved", "out", "cancelled"],
  approved: ["out", "cancelled"],
  out: ["returned"],
  returned: [],
  cancelled: ["planned"],
};
const ACTION_LABEL: Record<TripStatus, string> = {
  planned: "Re-open", approved: "Approve", out: "Mark out", returned: "Mark back", cancelled: "Cancel",
};

export default async function OffCampusPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const campus = parseCampus(sp.campus);
  const showPast = sp.past === "1";
  const me = await requireMember();
  const canDelete = me.role === "admin" || me.role === "lead";
  const today = todayNY();
  const trips = await getTrips(campus, showPast ? { to: today } : { from: today });
  const list = showPast ? [...trips].reverse() : trips;
  const out = trips.filter((t) => t.status === "out");

  return (
    <main className="page">
      <div className="between">
        <div className="stack-sm">
          <h1>Off-campus tracker</h1>
          <p className="lede">Every trip off campus: where, who, how many, and whether they&apos;re back.</p>
        </div>
        <CampusFilter base="/off-campus" current={campus} />
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      {!showPast && out.length > 0 && (
        <p className="notice" style={{ background: "#fff4df", color: "var(--amber-ink)" }}>
          {out.length} group{out.length > 1 ? "s are" : " is"} off campus right now.
        </p>
      )}

      <div className="split">
        <section className="main stack" aria-labelledby="trips-h">
          <div className="between" style={{ alignItems: "center" }}>
            <h2 id="trips-h">{showPast ? "Past trips" : "Today and upcoming"}</h2>
            <Link className="chip" href={`/off-campus?${new URLSearchParams({ ...(campus ? { campus } : {}), ...(showPast ? {} : { past: "1" }) })}`}>
              {showPast ? "Show upcoming" : "Show past trips"}
            </Link>
          </div>
          {list.length === 0 && <p className="empty">No {showPast ? "past" : "upcoming"} trips{campus ? ` for ${CAMPUS_LABEL[campus]}` : ""}.</p>}
          {list.map((t) => <TripCard key={t.id} trip={t} today={today} canDelete={canDelete} />)}
        </section>

        <section className="side card" aria-labelledby="new-h">
          <h2 id="new-h">Log a trip</h2>
          <TripForm />
        </section>
      </div>
    </main>
  );
}

function TripCard({ trip: t, today, canDelete }: { trip: Trip; today: string; canDelete: boolean }) {
  const s = TRIP_STATUS[t.status];
  const time = [t.depart_time && `Leave ${clock(t.depart_time)}`, t.return_time && `back ${clock(t.return_time)}`].filter(Boolean).join(", ");
  return (
    <article className="card" style={t.status === "out" ? { borderColor: "var(--amber)" } : undefined}>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div className="stack-sm">
          <span className="small muted">
            {t.trip_date === today ? "Today" : shortDay(t.trip_date)}{time ? ` · ${time}` : ""} · {CAMPUS_LABEL[t.campus]}
          </span>
          <h3 style={{ fontSize: 20 }}>{t.destination}</h3>
          <span>
            {[t.group_name, t.headcount != null && `${t.headcount} people`, t.lead_staff && `Lead: ${t.lead_staff}`, t.transport]
              .filter(Boolean).join(" · ")}
          </span>
          {t.notes && <span className="small muted" style={{ whiteSpace: "pre-line" }}>{t.notes}</span>}
        </div>
        <span className={`pill ${s.tone}`}>{s.label}</span>
      </div>
      <div className="row">
        {NEXT[t.status].map((n) => (
          <form key={n} action={setTripStatus}>
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="status" value={n} />
            <button type="submit" className={`btn sm ${n === "cancelled" ? "danger" : n === "out" ? "amber" : n === "returned" ? "" : "secondary"}`}>
              {ACTION_LABEL[n]}
            </button>
          </form>
        ))}
      </div>
      <details className="editor">
        <summary>Edit trip</summary>
        <TripForm trip={t} />
        {canDelete && (
          <form action={deleteTrip} style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className="btn danger sm">Delete trip</button>
          </form>
        )}
      </details>
    </article>
  );
}

function TripForm({ trip }: { trip?: Trip }) {
  const k = trip?.id ?? "new";
  return (
    <form action={saveTrip} className="form-grid">
      {trip && <input type="hidden" name="id" value={trip.id} />}
      <Field id={`t-dest-${k}`} label="Destination" name="destination" defaultValue={trip?.destination} required />
      <CampusSelect id={`t-campus-${k}`} defaultValue={trip?.campus ?? "maiden-ln"} allowBoth={false} />
      <Field id={`t-date-${k}`} label="Date" name="trip_date" type="date" defaultValue={trip?.trip_date} required />
      <Field id={`t-dep-${k}`} label="Leave" name="depart_time" type="time" defaultValue={trip?.depart_time?.slice(0, 5)} />
      <Field id={`t-ret-${k}`} label="Back by" name="return_time" type="time" defaultValue={trip?.return_time?.slice(0, 5)} />
      <Field id={`t-group-${k}`} label="Group / class" name="group_name" defaultValue={trip?.group_name ?? ""} />
      <Field id={`t-count-${k}`} label="Headcount" name="headcount" type="number" min={0} defaultValue={trip?.headcount ?? ""} />
      <Field id={`t-lead-${k}`} label="Lead staff" name="lead_staff" defaultValue={trip?.lead_staff ?? ""} />
      <Field id={`t-trans-${k}`} label="Transport" name="transport" defaultValue={trip?.transport ?? ""} placeholder="Walk, subway, bus…" />
      <TextArea id={`t-notes-${k}`} label="Notes (waivers, chaperones, phone on hand…)" name="notes" defaultValue={trip?.notes ?? ""} rows={2} />
      <button type="submit" className="btn">{trip ? "Save trip" : "Add to tracker"}</button>
    </form>
  );
}
