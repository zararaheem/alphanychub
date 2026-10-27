import { canManageStaff, requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { getStaff } from "@/lib/data";
import { deleteStaff, importStaff, moveStaff, saveStaff } from "@/lib/actions";
import { StaffList } from "@/components/staff-list";
import { Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { StaffCampus, StaffMember } from "@/lib/types";

type SP = Promise<{ msg?: string; err?: string; edit?: string }>;

const PLACES: { id: StaffCampus; label: string }[] = [
  { id: "maiden-ln", label: "Maiden Ln" },
  { id: "early-years", label: "Early Years" },
  { id: "all", label: "Both campuses" },
  { id: "unassigned", label: "Not assigned yet" },
];


export default async function StaffPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMember();
  const campus = await currentCampus();
  const manager = canManageStaff(me.role);
  const editing = manager && sp.edit === "1";
  const everyone = await getStaff(null);
  const staff = campus ? everyone.filter((s) => s.campus === campus || s.campus === "all") : everyone;
  const count = (c: StaffCampus) => everyone.filter((s) => s.campus === c).length;
  const both = count("all");

  return (
    <main className="page">
      <div className="between">
        <div className="stack-sm">
          <h1>Staff</h1>
          <p className="lede">Everyone on site{campus ? ` · ${CAMPUS_LABEL[campus]}` : " at both campuses"}.</p>
        </div>
        {manager && (
          <a href={editing ? "/staff" : "/staff?edit=1"} className="edit-toggle" aria-pressed={editing}>{editing ? "Done" : "Move & edit"}</a>
        )}
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      <div className="kpis">
        <div className="kpi">
          <span className="label-caps">Maiden Ln</span>
          <b>{count("maiden-ln") + both}</b>
          <span className="note">{count("maiden-ln")} here{both ? ` + ${both} across both` : ""}</span>
        </div>
        <div className="kpi">
          <span className="label-caps">Early Years</span>
          <b>{count("early-years") + both}</b>
          <span className="note">{count("early-years")} here{both ? ` + ${both} across both` : ""}</span>
        </div>
        <div className="kpi">
          <span className="label-caps">All staff</span>
          <b>{everyone.length}</b>
          <span className="note">{count("unassigned") ? `${count("unassigned")} not assigned to a campus yet` : "Everyone has a campus"}</span>
        </div>
      </div>

      {editing ? (
        <section className="card stack">
          <p className="small muted">Pick where each person works and choose Move. Both campuses counts them at Maiden Ln and Early Years.</p>
          <StaffEditor />
          <ul className="contact-list">
            {everyone.map((s) => (
              <li key={s.id} className="contact">
                <div className="who">
                  <strong>{s.name}</strong>
                  {(s.title || s.team) && <span className="role">{[s.title, s.team].filter(Boolean).join(" · ")}</span>}
                  <StaffEditor member={s} />
                </div>
                <form action={moveStaff} className="move-form">
                  <input type="hidden" name="id" value={s.id} />
                  <label className="sr-only" htmlFor={`mv-${s.id}`}>Campus for {s.name}</label>
                  <select id={`mv-${s.id}`} name="campus" className="input" defaultValue={s.campus}>
                    {PLACES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <button type="submit" className="btn sm secondary">Move</button>
                </form>
              </li>
            ))}
          </ul>
          <details className="editor">
            <summary>Replace the whole list from a Google Sheet</summary>
            <form action={importStaff} className="stack" style={{ paddingBottom: 12 }}>
              <p className="small muted">
                In the sheet: File → Download → Comma-separated values (.csv). Needs a Name column (or First / Last name). Optional: Title or Role,
                Team, Campus (Maiden Ln, William St / Early Years, Both), Email, Phone, Notes. Importing replaces everyone above.
              </p>
              <div className="field">
                <label htmlFor="st-file">CSV file</label>
                <input id="st-file" name="file" type="file" accept=".csv,text/csv" className="input" style={{ paddingTop: 9 }} required />
              </div>
              <button type="submit" className="btn" style={{ alignSelf: "flex-start" }}>Import staff</button>
            </form>
          </details>
        </section>
      ) : staff.length === 0 ? (
        <section className="card">
          <p className="empty">No staff listed yet.{manager ? " Choose Move & edit to add people." : " An admin or Campus Coordinator can add them."}</p>
        </section>
      ) : (
        <StaffList rows={staff} />
      )}
    </main>
  );
}

function StaffEditor({ member }: { member?: StaffMember }) {
  const k = member?.id ?? "new";
  return (
    <details className={member ? "editor quiet" : "editor"}>
      <summary>{member ? "Edit details" : "+ Add a person"}</summary>
      <form action={saveStaff} className="form-grid" style={{ paddingBottom: 12 }}>
        {member && <input type="hidden" name="id" value={member.id} />}
        <Field id={`s-name-${k}`} label="Name" name="name" defaultValue={member?.name} required />
        <Field id={`s-title-${k}`} label="Title" name="title" defaultValue={member?.title ?? ""} placeholder="e.g. Guide, Lead Guard" />
        <Field id={`s-team-${k}`} label="Team or level" name="team" defaultValue={member?.team ?? ""} placeholder="e.g. L2, Security" />
        <div className="field">
          <label htmlFor={`s-campus-${k}`}>Campus</label>
          <select id={`s-campus-${k}`} name="campus" className="input" defaultValue={member?.campus ?? "unassigned"}>
            {PLACES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <Field id={`s-phone-${k}`} label="Phone" name="phone" type="tel" defaultValue={member?.phone ?? ""} />
        <Field id={`s-email-${k}`} label="Email" name="email" type="email" defaultValue={member?.email ?? ""} />
        <Field id={`s-sort-${k}`} label="Order" name="sort" type="number" defaultValue={member?.sort ?? 0} />
        <TextArea id={`s-notes-${k}`} label="Notes" name="notes" defaultValue={member?.notes ?? ""} rows={2} />
        <button type="submit" className="btn">{member ? "Save" : "Add person"}</button>
      </form>
      {member && (
        <form action={deleteStaff}>
          <input type="hidden" name="id" value={member.id} />
          <button type="submit" className="btn danger sm">Remove {member.name}</button>
        </form>
      )}
    </details>
  );
}


