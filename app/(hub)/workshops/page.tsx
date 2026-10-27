import { requireMember, canEdit } from "@/lib/access";
import { CAMPUS_LABEL, clock, shortDay, todayNY } from "@/lib/campus";
import { getWorkshops } from "@/lib/data";
import { deleteWorkshop, saveWorkshop } from "@/lib/actions";
import { currentCampus } from "@/lib/campus-pref";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { Workshop } from "@/lib/types";
import { ActivityChecklist } from "@/components/activity-checklist";
import type { Campus } from "@/lib/campus";
import { LEVELS, LOCATIONS, MOMA_DATES, SESSION, SHOWCASES, WEEKLY, WORKSHOPS } from "@/lib/session2";

type SP = Promise<{ msg?: string; err?: string; view?: string; level?: string }>;

export default async function WorkshopsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const campus = await currentCampus();
  const me = await requireMember();
  const editable = canEdit(me.role);
  const view = sp.view === "staff" ? "staff" : "session";

  return (
    <main className="page">
      <div className="between" style={{ alignItems: "center" }}>
        <div className="stack-sm">
          <h1>Workshops</h1>
          <p className="lede">{view === "session" ? `Student workshops · ${SESSION.name} · ${SESSION.dates}` : "All-staff planning workshops"}</p>
        </div>
        <nav className="seg-links" aria-label="Workshop views">
          <a href="/workshops" aria-current={view === "session" ? "page" : undefined}>{SESSION.name}</a>
          <a href="/workshops?view=staff" aria-current={view === "staff" ? "page" : undefined}>Staff planning</a>
        </nav>
      </div>
      <Flash msg={sp.msg} err={sp.err} />
      {view === "session" && <ActivityChecklist />}
      {view === "session" ? <SessionView campus={campus} level={sp.level} /> : <StaffView campus={campus} editable={editable} />}
    </main>
  );
}

function SessionView({ campus, level }: { campus: Campus | null; level?: string }) {
  const levels = LEVELS.filter((l) => !campus || l.campus === campus);
  const picked = levels.find((l) => l.id === level);
  const shown = picked ? [picked] : levels;

  return (
    <>
      <div className="row" role="group" aria-label="Level" style={{ gap: 8 }}>
        <a href="/workshops" className="chip" aria-current={!picked ? "page" : undefined}>All levels</a>
        {levels.map((l) => (
          <a key={l.id} href={`/workshops?level=${l.id}`} className="chip" aria-current={picked?.id === l.id ? "page" : undefined}>{l.id}</a>
        ))}
      </div>

      <div className="split">
        <div className="main stack" style={{ gap: 32 }}>
          {shown.map((l) => {
            const list = WORKSHOPS.filter((w) => w.level === l.id);
            const week = WEEKLY[l.id];
            return (
              <section key={l.id} className="stack" aria-labelledby={`lvl-${l.id}`}>
                <div className="section-head">
                  <h2 id={`lvl-${l.id}`}>{l.name}</h2>
                  <span className="small muted">{CAMPUS_LABEL[l.campus]}{l.blocks ? ` · ${l.blocks}` : ""}</span>
                </div>
                <div className="ws-grid">
                  {list.map((w) => (
                    <details key={w.id} className="ws-card">
                      <summary>
                        <span className="ws-skill">{w.skill}</span>
                        <span className="ws-title">{w.title}</span>
                        <span className="ws-summary">{w.summary}</span>
                        {w.offCampus && <span className="ws-off">Off campus · {w.offCampus}</span>}
                        <span className="ws-more">Details</span>
                      </summary>
                      <div className="ws-body">
                        <p>{w.description}</p>
                        {w.alphatest && (<><span className="label-caps">AlphaTest</span><p>{w.alphatest}</p></>)}
                        {w.partners && (<><span className="label-caps">Partners</span><p>{w.partners}</p></>)}
                      </div>
                    </details>
                  ))}
                </div>
                {week && (
                  <details className="week">
                    <summary>Weekly schedule</summary>
                    <table>
                      <tbody>
                        {week.map((d) => (
                          <tr key={d.day}>
                            <th scope="row" style={{ width: 60 }}>{d.day}</th>
                            <td>{d.blocks.map((b) => <div key={b} className={b.includes("off campus") ? "off" : undefined}>{b}</div>)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </section>
            );
          })}
        </div>

        <aside className="side stack" style={{ gap: 20 }}>
          <section className="card" aria-labelledby="show-h">
            <h2 id="show-h">Showcases</h2>
            {SHOWCASES.filter((s) => !campus || (campus === "early-years") === s.levels.startsWith("WL")).map((s) => (
              <div key={s.date + s.levels} className="list-row">
                <span><strong style={{ fontWeight: 600 }}>{s.levels}</strong><span className="muted small"> · {s.time}{s.place ? ` · ${s.place}` : ""}</span></span>
                <span className="small muted">{s.date}</span>
              </div>
            ))}
          </section>
          {campus !== "early-years" && (
            <section className="card" aria-labelledby="loc-h">
              <h2 id="loc-h">Off-campus locations</h2>
              <ul className="plain">{LOCATIONS.map((l) => <li key={l}>{l}</li>)}</ul>
              <p className="small muted">MoMA dates: {MOMA_DATES}</p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

async function StaffView({ campus, editable }: { campus: Campus | null; editable: boolean }) {
  const today = todayNY();
  const all = await getWorkshops(campus);
  const upcoming = all.filter((w) => w.day >= today);
  const past = all.filter((w) => w.day < today).reverse();
  return (
    <>
      <section className="table-box" aria-labelledby="up-h">
        <h2 id="up-h" style={{ padding: "10px 10px 0" }}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="empty" style={{ margin: 10 }}>Nothing scheduled.</p>
        ) : (
          <WorkshopTable rows={upcoming} editable={editable} today={today} />
        )}
      </section>

      {editable && (
        <details className="editor">
          <summary>+ Add a staff workshop</summary>
          <section className="card" style={{ marginTop: 8 }}>
            <WorkshopForm />
          </section>
        </details>
      )}

      {past.length > 0 && (
        <details className="table-box">
          <summary style={{ cursor: "pointer", fontWeight: 600, padding: 10 }}>Past workshops ({past.length})</summary>
          <WorkshopTable rows={past} editable={editable} today={today} />
        </details>
      )}
    </>
  );
}

function WorkshopTable({ rows, editable, today }: { rows: Workshop[]; editable: boolean; today: string }) {
  return (
    <table style={{ minWidth: 560 }}>
      <thead>
        <tr><th scope="col">Day</th><th scope="col">Time</th><th scope="col">Topic</th><th scope="col">Campus</th></tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id} style={w.day === today ? { background: "var(--teal-soft)" } : undefined}>
            <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{shortDay(w.day)}{w.day === today && <span className="pill teal" style={{ marginLeft: 8 }}>Today</span>}</td>
            <td style={{ whiteSpace: "nowrap" }} className="muted">{w.start_time ? `${clock(w.start_time)}–${clock(w.end_time)}` : "TBD"}</td>
            <td>
              {w.topic}
              {w.notes && <div className="small muted" style={{ whiteSpace: "pre-line" }}>{w.notes}</div>}
              {editable && (
                <details className="editor quiet">
                  <summary>Edit</summary>
                  <WorkshopForm workshop={w} />
                  <form action={deleteWorkshop} style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" className="btn danger sm">Remove</button>
                  </form>
                </details>
              )}
            </td>
            <td className="muted">{CAMPUS_LABEL[w.campus]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WorkshopForm({ workshop }: { workshop?: Workshop }) {
  const k = workshop?.id ?? "new";
  return (
    <form action={saveWorkshop} className="form-grid">
      {workshop && <input type="hidden" name="id" value={workshop.id} />}
      <Field id={`w-day-${k}`} label="Day" name="day" type="date" defaultValue={workshop?.day} required />
      <Field id={`w-start-${k}`} label="Start" name="start_time" type="time" defaultValue={workshop?.start_time?.slice(0, 5) ?? "07:45"} />
      <Field id={`w-end-${k}`} label="End" name="end_time" type="time" defaultValue={workshop?.end_time?.slice(0, 5) ?? "08:05"} />
      <CampusSelect id={`w-campus-${k}`} defaultValue={workshop?.campus} />
      <Field id={`w-topic-${k}`} label="Topic" name="topic" defaultValue={workshop?.topic} required />
      <TextArea id={`w-notes-${k}`} label="Notes / agenda" name="notes" defaultValue={workshop?.notes ?? ""} rows={2} />
      <button type="submit" className="btn">{workshop ? "Save" : "Add workshop"}</button>
    </form>
  );
}
