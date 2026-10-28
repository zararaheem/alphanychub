import { requireMember, canEdit, canManageStaff, canSeeParents } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { getContacts, getParentContacts, getProcedures } from "@/lib/data";
import { deleteContact, deleteProcedure, importParentContacts, lockParents, saveContact, saveProcedure, unlockParents } from "@/lib/actions";
import { isUnlocked, UNLOCK_MINUTES } from "@/lib/parent-lock";
import { ParentContacts } from "@/components/parent-contacts";
import Link from "next/link";
import { isRespondNow, procKind, shortTitle } from "@/lib/procedure-meta";
import { ProcIcon } from "@/components/procedure-view";
import { currentCampus } from "@/lib/campus-pref";
import { CampusSelect, Field, TextArea } from "@/components/fields";
import { Flash } from "@/components/flash";
import type { Contact, Procedure } from "@/lib/types";

type SP = Promise<{ msg?: string; err?: string; edit?: string }>;

export default async function EmergencyPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const campus = await currentCampus();
  const me = await requireMember();
  const editable = canEdit(me.role);
  // Edit controls stay hidden until an editor turns them on for a section.
  const editing = (section: string) => editable && sp.edit === section;
  const EditToggle = ({ section }: { section: string }) =>
    editable ? (
      <a href={editing(section) ? "/emergency" : `/emergency?edit=${section}`} className="edit-toggle" aria-pressed={editing(section)}>
        {editing(section) ? "Done" : "Edit"}
      </a>
    ) : null;
  const parentAccess = canSeeParents(me);
  // Contacts are only fetched (and sent to the browser) once the viewer has entered their code.
  const unlocked = parentAccess && (await isUnlocked(me));
  const parentManager = canManageStaff(me.role);
  const [contacts, procedures, parents] = await Promise.all([
    getContacts(campus), getProcedures(campus), unlocked ? getParentContacts(campus) : Promise.resolve([]),
  ]);
  const respond = procedures.filter(isRespondNow);
  const reference = procedures.filter((p) => !isRespondNow(p));

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Emergency</h1>
        <p className="lede">
          Who to call and what to do{campus ? ` · ${CAMPUS_LABEL[campus]}` : ""}. <Link href="/guides/emergency">Printable one-pager →</Link>
        </p>
      </div>

      <section className="sos" aria-label="In an emergency">
        <a href="tel:911" className="btn sos-call"><PhoneIcon /> Call 911</a>
        <ol className="sos-steps">
          <li><b>1</b> Call 911 if anyone is in danger</li>
          <li><b>2</b> Alert everyone by radio (alt: Zello)</li>
          <li><b>3</b> Notify the Emergency Coordinator</li>
        </ol>
        <span className="sos-code">Lockdown code: <b>&lsquo;Tiger, Tiger&rsquo;</b></span>
      </section>
      <Flash msg={sp.msg} err={sp.err} />

      {respond.length > 0 && (
        <section aria-labelledby="now-h" className="stack-sm" style={{ gap: 10 }}>
          <h2 id="now-h" className="label-caps">What&rsquo;s happening?</h2>
          <div className="em-tiles">
            {respond.map((p) => {
              const kind = procKind(p.title);
              return (
                <Link key={p.id} href={`/emergency/${p.id}`} className={`em-tile k-${kind}`}>
                  <span className={`proc-icon k-${kind}`}><ProcIcon kind={kind} /></span>
                  <span>{shortTitle(p.title)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="split">
        <div className="main stack" style={{ gap: 28 }}>
          <section className="card" aria-labelledby="contacts-h">
            <div className="section-head">
              <h2 id="contacts-h">Immediate contacts</h2>
              <EditToggle section="contacts" />
            </div>
            {contacts.length === 0 ? (
              <p className="empty">No contacts yet.{editable ? " Choose Edit to add the first one." : " An admin or Lead Guide can add them."}</p>
            ) : (
              <ul className="contact-list">
                {contacts.map((c) => (
                  <li key={c.id} className="contact">
                    <div className="who">
                      <strong>
                        {c.name}
                        {!campus && c.campus !== "all" && <span className="tag">{CAMPUS_LABEL[c.campus]}</span>}
                      </strong>
                      {c.role && <span className="role">{c.role}</span>}
                      {c.notes && <span className="note">{c.notes}</span>}
                      {editing("contacts") && <ContactEditor contact={c} />}
                    </div>
                    <div className="actions">
                      {c.phone && (
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className={`call-btn${c.phone === "911" ? " urgent" : ""}`} aria-label={`Call ${c.name}: ${c.phone}`}>
                          <PhoneIcon /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="call-btn" aria-label={`Email ${c.name}: ${c.email}`} title={c.email}>
                          <MailIcon /> Email
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {editing("contacts") && <ContactEditor />}
          </section>

          <section className="card" aria-labelledby="parents-h">
            <div className="section-head">
              <h2 id="parents-h">Parent contacts</h2>
              <span className="row" style={{ gap: 12 }}>
                {parents.length > 0 && (
                  <span className="small muted">
                    Updated {new Date(parents[0].imported_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}
                  </span>
                )}
                {parents.length > 0 && parentManager && <EditToggle section="parents" />}
                {unlocked && (
                  <form action={lockParents}>
                    <button type="submit" className="btn ghost sm">Hide</button>
                  </form>
                )}
              </span>
            </div>
            {!parentAccess ? (
              <p className="empty">Parent contacts are limited to approved staff. Ask an admin if you need access.</p>
            ) : !unlocked ? (
              <details className="parent-lock">
                <summary>Show parent contacts</summary>
                <form action={unlockParents} className="row" style={{ gap: 8, alignItems: "flex-end" }}>
                  <div className="field" style={{ flex: "1 1 200px" }}>
                    <label htmlFor="pc-code">Your parent-contacts code</label>
                    <input id="pc-code" name="code" type="password" className="input" autoComplete="off" required />
                  </div>
                  <button type="submit" className="btn">Unlock</button>
                </form>
                <p className="small muted">Stays open for {UNLOCK_MINUTES} minutes on this device, then hides again.</p>
              </details>
            ) : parents.length === 0 ? (
              <p className="empty">No parent contacts yet.{parentManager ? " Import the Google Sheet below." : " An admin or Campus Coordinator can import them."}</p>
            ) : (
              <ParentContacts rows={parents} />
            )}
            {parentManager && unlocked && (parents.length === 0 || sp.edit === "parents") && (
              <details className="editor" open={editing("parents")}>
                <summary>{parents.length ? "Re-import from Google Sheet" : "+ Import from Google Sheet"}</summary>
                <form action={importParentContacts} className="stack" style={{ paddingBottom: 12 }}>
                  <p className="small muted">
                    In the sheet: File → Download → Comma-separated values (.csv). Needs a student column and a grade column, plus parent
                    name / phone / email columns (&quot;Parent 1 Phone&quot;, &quot;Parent 2 Email&quot;… also work). PreK and K go under Early Years;
                    grades 1–12 under Maiden Ln. Importing replaces the whole list.
                  </p>
                  <div className="field">
                    <label htmlFor="pc-file">CSV file</label>
                    <input id="pc-file" name="file" type="file" accept=".csv,text/csv" className="input" style={{ paddingTop: 9 }} required />
                  </div>
                  <button type="submit" className="btn" style={{ alignSelf: "flex-start" }}>Import parent contacts</button>
                </form>
              </details>
            )}
          </section>
        </div>

        <section className="side card" aria-labelledby="proc-h">
          <div className="section-head">
            <h2 id="proc-h">Procedures</h2>
            <EditToggle section="procedures" />
          </div>
          {procedures.length === 0 && (
            <p className="empty">No procedures yet.{editable ? " Choose Edit to add lockdown, evacuation and so on." : ""}</p>
          )}
          {editing("procedures") ? (
            <div className="proc-list">
              {procedures.map((p) => (
                <details key={p.id}>
                  <summary>
                    <span>{p.title}</span>
                    <Chevron />
                  </summary>
                  <ProcedureEditor procedure={p} />
                </details>
              ))}
            </div>
          ) : (
            [["Respond now", respond], ["Reference", reference]].map(([label, list]) =>
              (list as typeof procedures).length > 0 && (
                <div key={label as string} className="stack-sm" style={{ gap: 0 }}>
                  <span className="label-caps" style={{ margin: "10px 0 2px" }}>{label as string}</span>
                  <ul className="proc-links">
                    {(list as typeof procedures).map((p) => (
                      <li key={p.id}>
                        <Link href={`/emergency/${p.id}`}>
                          <span className={`proc-icon sm k-${procKind(p.title)}`}><ProcIcon kind={procKind(p.title)} size={16} /></span>
                          <span className="t">
                            {p.title}
                            {!campus && p.campus !== "all" && <span className="tag">{CAMPUS_LABEL[p.campus]}</span>}
                          </span>
                          <span aria-hidden="true" className="muted">›</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )
          )}
          {editing("procedures") && <ProcedureEditor />}
        </section>
      </div>
    </main>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ContactEditor({ contact }: { contact?: Contact }) {
  const k = contact?.id ?? "new";
  return (
    <details className={contact ? "editor quiet" : "editor"}>
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
    <details className={procedure ? "editor quiet" : "editor"}>
      <summary>{procedure ? "Edit" : "+ Add a procedure"}</summary>
      <form action={saveProcedure} className="form-grid" style={{ paddingBottom: 12 }}>
        {procedure && <input type="hidden" name="id" value={procedure.id} />}
        <Field id={`p-title-${k}`} label="Title" name="title" defaultValue={procedure?.title} placeholder="e.g. Lockdown" required />
        <CampusSelect id={`p-campus-${k}`} defaultValue={procedure?.campus} />
        <Field id={`p-sort-${k}`} label="Order (10–19 = Respond now)" name="sort" type="number" defaultValue={procedure?.sort ?? 0} />
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
