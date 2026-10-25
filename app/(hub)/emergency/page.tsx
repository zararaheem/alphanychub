import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL, parseCampus } from "@/lib/campus";
import { getContacts, getProcedures } from "@/lib/data";
import { deleteContact, deleteProcedure, saveContact, saveProcedure } from "@/lib/actions";
import { CampusFilter } from "@/components/campus-filter";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { Contact, Procedure } from "@/lib/types";

type SP = Promise<{ campus?: string; msg?: string; err?: string }>;

export default async function EmergencyPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const campus = parseCampus(sp.campus);
  const me = await requireMember();
  const canEdit = me.role === "admin" || me.role === "lead";
  const [contacts, procedures] = await Promise.all([getContacts(campus), getProcedures(campus)]);

  return (
    <main className="page">
      <div className="between">
        <div className="stack-sm">
          <h1>Emergency</h1>
          <p className="lede">Call 911 first in any life-threatening emergency. Then use the contacts and procedures below.</p>
        </div>
        <CampusFilter base="/emergency" current={campus} />
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      <div className="split">
        <section className="main card" aria-labelledby="contacts-h">
          <h2 id="contacts-h">Emergency contact list</h2>
          {contacts.length === 0 ? (
            <p className="empty">No contacts yet.{canEdit ? " Add the first one below." : " An admin or Lead Guide can add them."}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 560 }}>
                <thead>
                  <tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Phone</th><th scope="col">Campus</th></tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.email && <div className="small"><a href={`mailto:${c.email}`}>{c.email}</a></div>}
                        {c.notes && <div className="small muted">{c.notes}</div>}
                        {canEdit && <ContactEditor contact={c} />}
                      </td>
                      <td>{c.role}</td>
                      <td>{c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{c.phone}</a>}</td>
                      <td className="muted">{CAMPUS_LABEL[c.campus]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canEdit && <ContactEditor />}
        </section>

        <section className="side card" aria-labelledby="proc-h">
          <h2 id="proc-h">Emergency procedures</h2>
          {procedures.length === 0 && (
            <p className="empty">No procedures yet.{canEdit ? " Add lockdown, evacuation, shelter-in-place and so on below." : ""}</p>
          )}
          {procedures.map((p) => (
            <details key={p.id} className="card" style={{ padding: 14, gap: 8 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 32 }}>
                {p.title} <span className="pill" style={{ marginLeft: 6 }}>{CAMPUS_LABEL[p.campus]}</span>
              </summary>
              <p style={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{p.body}</p>
              {canEdit && <ProcedureEditor procedure={p} />}
            </details>
          ))}
          {canEdit && <ProcedureEditor />}
        </section>
      </div>
    </main>
  );
}

function ContactEditor({ contact }: { contact?: Contact }) {
  const k = contact?.id ?? "new";
  return (
    <details className="editor">
      <summary>{contact ? "Edit" : "+ Add a contact"}</summary>
      <form action={saveContact} className="form-grid" style={{ paddingBottom: 12 }}>
        {contact && <input type="hidden" name="id" value={contact.id} />}
        <Field id={`c-name-${k}`} label="Name" name="name" defaultValue={contact?.name} required />
        <Field id={`c-role-${k}`} label="Role" name="role" defaultValue={contact?.role ?? ""} placeholder="e.g. Head of School" />
        <Field id={`c-phone-${k}`} label="Phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        <Field id={`c-email-${k}`} label="Email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        <CampusSelect id={`c-campus-${k}`} defaultValue={contact?.campus} />
        <Field id={`c-sort-${k}`} label="Order" name="sort" type="number" defaultValue={contact?.sort ?? 0} />
        <TextArea id={`c-notes-${k}`} label="Notes" name="notes" defaultValue={contact?.notes ?? ""} rows={2} />
        <button type="submit" className="btn">{contact ? "Save contact" : "Add contact"}</button>
      </form>
      {contact && (
        <form action={deleteContact}>
          <input type="hidden" name="id" value={contact.id} />
          <button type="submit" className="btn danger sm">Remove contact</button>
        </form>
      )}
    </details>
  );
}

function ProcedureEditor({ procedure }: { procedure?: Procedure }) {
  const k = procedure?.id ?? "new";
  return (
    <details className="editor">
      <summary>{procedure ? "Edit procedure" : "+ Add a procedure"}</summary>
      <form action={saveProcedure} className="form-grid" style={{ paddingBottom: 12 }}>
        {procedure && <input type="hidden" name="id" value={procedure.id} />}
        <Field id={`p-title-${k}`} label="Title" name="title" defaultValue={procedure?.title} placeholder="e.g. Lockdown" required />
        <CampusSelect id={`p-campus-${k}`} defaultValue={procedure?.campus} />
        <Field id={`p-sort-${k}`} label="Order" name="sort" type="number" defaultValue={procedure?.sort ?? 0} />
        <TextArea id={`p-body-${k}`} label="Steps (one per line)" name="body" defaultValue={procedure?.body ?? ""} rows={6} />
        <button type="submit" className="btn">{procedure ? "Save procedure" : "Add procedure"}</button>
      </form>
      {procedure && (
        <form action={deleteProcedure}>
          <input type="hidden" name="id" value={procedure.id} />
          <button type="submit" className="btn danger sm">Remove procedure</button>
        </form>
      )}
    </details>
  );
}
