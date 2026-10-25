import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL, clock, parseCampus, shortDay, todayNY } from "@/lib/campus";
import { getWorkshops } from "@/lib/data";
import { deleteWorkshop, saveWorkshop } from "@/lib/actions";
import { CampusFilter } from "@/components/campus-filter";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { Workshop } from "@/lib/types";

type SP = Promise<{ campus?: string; msg?: string; err?: string }>;

export default async function WorkshopsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const campus = parseCampus(sp.campus);
  const me = await requireMember();
  const canEdit = me.role === "admin" || me.role === "lead";
  const today = todayNY();
  const all = await getWorkshops(campus);
  const upcoming = all.filter((w) => w.day >= today);
  const past = all.filter((w) => w.day < today).reverse();

  return (
    <main className="page">
      <div className="between">
        <div className="stack-sm">
          <h1>Planning workshops</h1>
          <p className="lede">All-staff workshop schedule. Off-campus trips and transportation are covered here too.</p>
        </div>
        <CampusFilter base="/workshops" current={campus} />
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      <section className="table-box" aria-labelledby="up-h">
        <h2 id="up-h" style={{ padding: "10px 10px 0" }}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="empty" style={{ margin: 10 }}>Nothing scheduled.</p>
        ) : (
          <WorkshopTable rows={upcoming} canEdit={canEdit} today={today} />
        )}
      </section>

      {canEdit && (
        <section className="card" aria-labelledby="add-h">
          <h2 id="add-h">Add a workshop</h2>
          <WorkshopForm />
        </section>
      )}

      {past.length > 0 && (
        <details className="table-box">
          <summary style={{ cursor: "pointer", fontWeight: 700, padding: 10 }}>Past workshops ({past.length})</summary>
          <WorkshopTable rows={past} canEdit={canEdit} today={today} />
        </details>
      )}
    </main>
  );
}

function WorkshopTable({ rows, canEdit, today }: { rows: Workshop[]; canEdit: boolean; today: string }) {
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
              {canEdit && (
                <details className="editor">
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
