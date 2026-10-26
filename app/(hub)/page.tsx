import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUSES, clock, shortDay, todayNY } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { LEVELS, SESSION, WORKSHOPS } from "@/lib/session2";
import { getContacts, getProcedures, getWorkshops } from "@/lib/data";
import { OFF_CAMPUS_URL } from "@/lib/links";
import { Clock } from "@/components/clock";
import { ExtIcon } from "@/components/external-link";

export default async function HomePage() {
  const me = await requireMember();
  const today = todayNY();
  const campus = await currentCampus();
  const here = campus ? CAMPUSES.find((c) => c.id === campus)! : null;
  const [contacts, procedures, workshops] = await Promise.all([
    getContacts(campus), getProcedures(campus), getWorkshops(campus, { from: today }),
  ]);
  const next = workshops[0];
  const levelsHere = LEVELS.filter((l) => !campus || l.campus === campus);
  const levelCount = levelsHere.length;
  const sessionCount = WORKSHOPS.filter((w) => levelsHere.some((l) => l.id === w.level)).length;
  const first = me.name && !me.name.startsWith("Staff") ? me.name.split(" ")[0] : null;

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="stack-sm" style={{ gap: 10 }}>
            <span className="kicker" style={{ color: "#fff", opacity: 0.85 }}>Alpha Anywhere Learning Center</span>
            <h1>Staff hub <em>today</em></h1>
            <span style={{ color: "var(--ink-2)" }}>{first ? `Hi, ${first}. ` : ""}{here ? `${here.name} · ${here.blurb}` : "Everything staff need for Maiden Ln and Early Years."}</span>
          </div>
          <Clock />
        </div>
      </section>

      <main className="page">
        <div className="kpis">
          <div className="kpi">
            <span className="label-caps">Students on campus today</span>
            <b style={{ color: "var(--muted)" }}>--</b>
            <span className="note">Coming soon, from the Attendance app</span>
          </div>
          <div className="kpi">
            <span className="label-caps">Next staff workshop</span>
            <b style={{ fontSize: 24 }}>{next ? `${shortDay(next.day)}${next.start_time ? ` · ${clock(next.start_time)}` : ""}` : "None scheduled"}</b>
            <span className="note">{next?.topic ?? "Add one on the Workshops tab"}</span>
          </div>
          <div className="kpi">
            <span className="label-caps">In an emergency</span>
            <b>Call 911</b>
            <span className="note">Then everyone to radio Channel 2</span>
          </div>
        </div>

        <div className="grid">
          <Link href="/emergency" className="card card-link card-alert">
            <span className="card-title">Emergency contact list</span>
            <span className="muted">Immediate contacts first, then parent contacts by campus, plus step-by-step procedures.</span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <span className="stat"><b>{contacts.length}</b><span>contacts</span></span>
              <span className="stat"><b>{procedures.length}</b><span>procedures</span></span>
            </span>
          </Link>

          {OFF_CAMPUS_URL ? (
            <a href={OFF_CAMPUS_URL} target="_blank" rel="noopener noreferrer" className="card card-link">
              <span className="row" style={{ justifyContent: "space-between" }}>
                <span className="card-title">Off-campus tracker</span>
                <span className="pill mint">Opens board <ExtIcon /></span>
              </span>
              <span className="muted">Today&apos;s off-campus board: plan and clear trips, see who&apos;s out, check students out and back in.</span>
            </a>
          ) : (
            <div className="card">
              <span className="card-title">Off-campus tracker</span>
              <span className="muted">Links to the Off-Campus Today board in the Attendance app.</span>
              <span className="pill amber" style={{ alignSelf: "flex-start" }}>Coming soon</span>
            </div>
          )}

          <Link href="/workshops" className="card card-link">
            <span className="card-title">Workshops</span>
            <span className="muted">{SESSION.name} student workshops by level, plus the all-staff planning schedule.</span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <span className="stat"><b>{sessionCount}</b><span>{SESSION.name} workshops</span></span>
              <span className="stat"><b>{levelCount}</b><span>levels</span></span>
            </span>
          </Link>
        </div>

        <section className="stack" aria-labelledby="campus-h">
          <h2 id="campus-h" className="label-caps">Campuses</h2>
          <div className="grid">
            {CAMPUSES.filter((c) => !campus || c.id === campus).map((c) => (
              <Link key={c.id} href={`/${c.id}`} className="card card-link">
                <span className="card-title">{c.name}</span>
                <span className="muted">{c.blurb}</span>
                <span className="small" style={{ color: "var(--teal)", fontWeight: 700 }}>Open campus page →</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
