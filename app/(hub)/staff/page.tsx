import { canEdit, requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { getStaff } from "@/lib/data";
import { deleteStaff, importStaff, saveStaff } from "@/lib/actions";
import { StaffList } from "@/components/staff-list";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { StaffMember } from "@/lib/types";

type SP = Promise<{ msg?: string; err?: string; edit?: string }>;

export default async function StaffPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMember();
  const campus = await currentCampus();
  const editable = canEdit(me.role);
  const editing = editable && sp.edit === "1";
  const staff = await getStaff(campus);

  return (
    <main className="page">
      <div className="between">
        <div className="stack-sm">
          <h1>Staff</h1>
          <p className="lede">Everyone on site{campus ? ` · ${CAMPUS_LABEL[campus]}` : " at both campuses"}. {staff.length} {staff.length === 1 ? "person" : "people"}.</p>
        </div>
        {editable && (
          <a href={editing ? "/staff" : "/staff?edit=1"} className="edit-toggle" aria-pressed={editing}>{editing ? "Done" : "Edit"}</a>
        )}
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      {editing ? (
        <section className="card stack">
          <details className="editor">
            <summary>{staff.length ? "Replace from Google Sheet" : "+ Import from Google Sheet"}</summary>
            <form action={importStaff} className="stack" style={{ paddingBottom: 12 }}>
              <p className="small muted">
                In the sheet: File → Download → Comma-separated values (.csv). Needs a Name column (or First / Last name). Optional: Title or Role,
                Team, Campus (Maiden Ln, William St / Early Years, or blank for both), Email, Phone, Notes. Importing replaces the whole list.
              </p>
              <div className="field">
                <label htmlFor="st-file">CSV file</label>
                <input id="st-file" name="file" type="file" accept=".csv,text/csv" className="input" style={{ paddingTop: 9 }} required />
              </div>
              <button type="submit" className="btn" style={{ alignSelf: "flex-start" }}>Import staff</button>
            </form>
          </details>
          <StaffEditor />
          <ul className="contact-list">
            {staff.map((s) => (
              <li key={s.id} className="contact">
                <div className="who">
                  <strong>
                    {s.name}
                    {!campus && s.campus !== "all" && <span className="tag">{CAMPUS_LABEL[s.campus]}</span>}
                  </strong>
                  {(s.title || s.team) && <span className="role">{[s.title, s.team].filter(Boolean).join(" · ")}</span>}
                  <StaffEditor member={s} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : staff.length === 0 ? (
        <section className="card">
          <p className="empty">
            No staff listed yet.{editable ? " Choose Edit to add people or import the staff Google Sheet." : " An admin, Campus Coordinator or Lead Guide can add them."}
          </p>
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
      <summary>{member ? "Edit" : "+ Add a person"}</summary>
      <form action={saveStaff} className="form-grid" style={{ paddingBottom: 12 }}>
        {member && <input type="hidden" name="id" value={member.id} />}
        <Field id={`s-name-${k}`} label="Name" name="name" defaultValue={member?.name} required />
        <Field id={`s-title-${k}`} label="Title" name="title" defaultValue={member?.title ?? ""} placeholder="e.g. Guide, Lead Guard" />
        <Field id={`s-team-${k}`} label="Team or level" name="team" defaultValue={member?.team ?? ""} placeholder="e.g. L2, Operations" />
        <CampusSelect id={`s-campus-${k}`} defaultValue={member?.campus} />
        <Field id={`s-phone-${k}`} label="Phone" name="phone" type="tel" defaultValue={member?.phone ?? ""} />
        <Field id={`s-email-${k}`} label="Email" name="email" type="email" defaultValue={member?.email ?? ""} />
        <Field id={`s-sort-${k}`} label="Order" name="sort" type="number" defaultValue={member?.sort ?? 0} />
        <TextArea id={`s-notes-${k}`} label="Notes" name="notes" defaultValue={member?.notes ?? ""} rows={2} />
        <button type="submit" className="btn">{member ? "Save" : "Add person"}</button>
      </form>
      {member && (
        <form action={deleteStaff}>
          <input type="hidden" name="id" value={member.id} />
          <button type="submit" className="btn danger sm">Remove</button>
        </form>
      )}
    </details>
  );
}
