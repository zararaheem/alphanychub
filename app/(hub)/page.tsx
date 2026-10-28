import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUSES, clock, shortDay, todayNY } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { LEVELS, SESSION, WORKSHOPS } from "@/lib/session2";
import { getStaff, getStudents, getWorkshops } from "@/lib/data";
import { OFF_CAMPUS_URL } from "@/lib/links";
import { Clock } from "@/components/clock";
import { ExtIcon } from "@/components/external-link";
import { WhoToAsk } from "@/components/who-to-ask";

export default async function HomePage() {
  const me = await requireMember();
  const today = todayNY();
  const campus = await currentCampus();
  const here = campus ? CAMPUSES.find((c) => c.id === campus)! : null;
  const [workshops, staff, students] = await Promise.all([
    getWorkshops(campus, { from: today }), getStaff(campus), getStudents(campus),
  ]);
  const onSite = staff.filter((s) => s.campus !== "unassigned");
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
            <span className="label-caps">Students enrolled</span>
            <b>{students.length || "--"}</b>
            <span className="note">{here ? here.name : "Both campuses"} · today&apos;s count from Attendance coming soon</span>
          </div>
          <div className="kpi">
            <span className="label-caps">Next staff workshop</span>
            <b style={{ fontSize: 24 }}>{next ? `${shortDay(next.day)}${next.start_time ? ` · ${clock(next.start_time)}` : ""}` : "None scheduled"}</b>
            <span className="note">{next?.topic ?? "Add one on the Workshops tab"}</span>
          </div>
          <div className="kpi">
            <span className="label-caps">In an emergency</span>
            <b>Call 911</b>
            <span className="note">Then alert everyone by radio (alt: Zello)</span>
          </div>
        </div>

        <nav className="quick" aria-label="Quick actions">
          <span className="label-caps">Right now</span>
          <div className="quick-grid">
            <Link href="/guides/emergency" className="quick-btn alert"><b>Emergency</b><span>First 60 seconds, golden rules</span></Link>
            <Link href="/guides/security" className="quick-btn"><b>Missing student</b><span>Who to contact, what to do</span></Link>
            <Link href="/health" className="quick-btn"><b>Hurt or unwell</b><span>Medical steps, medications</span></Link>
            <Link href="/guides/checklist" className="quick-btn"><b>Before a trip</b><span>12 checks, who helps</span></Link>
          </div>
        </nav>

        <div className="grid">
          <Link href="/emergency" className="card card-link card-alert">
            <span className="card-title">Emergency contacts &amp; procedures</span>
            <span className="muted">Who to call first, tap-to-call numbers, and step-by-step lockdown, fire, medical and evacuation.</span>
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

          <Link href="/health" className="card card-link">
            <span className="card-title">Health &amp; safety</span>
            <span className="muted">Student medications (who, when, dose, where stored), the medical emergency steps, and what to carry on trips.</span>
          </Link>

          <Link href="/staff" className="card card-link">
            <span className="card-title">Staff</span>
            <span className="muted">Everyone on site{here ? ` at ${here.name}` : ""}, with phone and email.</span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <span className="stat"><b>{onSite.length}</b><span>{here ? "on this campus" : "with a campus"}</span></span>
              {!here && <span className="stat"><b>{staff.length - onSite.length}</b><span>not assigned yet</span></span>}
            </span>
          </Link>

          <Link href="/workshops" className="card card-link">
            <span className="card-title">Workshops</span>
            <span className="muted">{SESSION.name} student workshops by level, plus the all-staff planning schedule.</span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <span className="stat"><b>{sessionCount}</b><span>{SESSION.name} workshops</span></span>
              <span className="stat"><b>{levelCount}</b><span>levels</span></span>
            </span>
          </Link>
        </div>

        <section className="card" aria-labelledby="who-h">
          <div className="between" style={{ alignItems: "baseline" }}>
            <h2 id="who-h">Who do I ask?</h2>
            <a href="/guides/checklist" className="small">Before-every-activity checklist →</a>
          </div>
          <WhoToAsk />
        </section>

        {!campus && (
        <section className="stack" aria-labelledby="campus-h">
          <h2 id="campus-h" className="label-caps">Focus on one campus</h2>
          <div className="grid">
            {CAMPUSES.map((c) => (
              <a key={c.id} href={`/campus?set=${c.id}&next=/`} className="card card-link">
                <span className="card-title">{c.name}</span>
                <span className="muted">{c.blurb}</span>
                <span className="small" style={{ color: "var(--teal)", fontWeight: 700 }}>Show this campus →</span>
              </a>
            ))}
          </div>
        </section>
        )}
      </main>
    </>
  );
}
