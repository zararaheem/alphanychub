import { ADMINS, requireRole, ROLE_LABELS, type Member, type Role } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { addMember, removeMember } from "@/lib/actions";
import { Field } from "@/components/fields";
import { Flash } from "@/components/flash";

type SP = Promise<{ msg?: string; err?: string }>;
type Row = Member & { added_by: string | null; created_at: string };

const ROLE_HELP: Record<Role, string> = {
  admin: "Manages this access list and edits everything",
  coordinator: "Edits everything and sees every dashboard; can't manage this access list",
  lead: "Edits emergency info and workshops; sees the Early Years lead dashboard",
  guide: "Pre-K / Kinder Guide: uses the hub and logs trips",
  staff: "Other staff: uses the hub and logs trips",
};

export default async function AccessPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireRole(ADMINS);
  const supabase = await createClient();
  const { data } = await supabase.from("allowed_users").select("email, role, name, added_by, created_at").order("role").order("email");
  const rows = (data ?? []) as Row[];

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Access</h1>
        <p className="lede">Only people on this list can sign in. They sign in with the Google account for the email you add.</p>
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      <section className="card" aria-labelledby="add-h">
        <h2 id="add-h">Add a guide or staff member</h2>
        <form action={addMember} className="form-grid">
          <Field id="m-email" label="School email" name="email" type="email" required placeholder="name@alpha.school" />
          <Field id="m-name" label="Name" name="name" />
          <div className="field">
            <label htmlFor="m-role">Role</label>
            <select id="m-role" name="role" className="input" defaultValue="guide">
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <button type="submit" className="btn">Give access</button>
        </form>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          {(Object.keys(ROLE_HELP) as Role[]).map((r) => <li key={r}><strong>{ROLE_LABELS[r]}:</strong> {ROLE_HELP[r]}</li>)}
        </ul>
      </section>

      <section className="table-box" aria-labelledby="list-h">
        <h2 id="list-h" style={{ padding: "10px 10px 0" }}>{rows.length} people with access</h2>
        <table style={{ minWidth: 640 }}>
          <thead>
            <tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Added by</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email}>
                <td><strong>{r.name ?? r.email}</strong>{r.name && <div className="small muted">{r.email}</div>}</td>
                <td>
                  <form action={addMember} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="email" value={r.email} />
                    <input type="hidden" name="name" value={r.name ?? ""} />
                    <label className="sr-only" htmlFor={`role-${r.email}`}>Role for {r.email}</label>
                    <select id={`role-${r.email}`} name="role" className="input" defaultValue={r.role} style={{ width: "auto", minHeight: 36 }} disabled={r.email === me.email}>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}
                    </select>
                    {r.email !== me.email && <button type="submit" className="btn secondary sm">Update</button>}
                  </form>
                </td>
                <td className="small muted">{r.added_by ?? ""}</td>
                <td>
                  {r.email === me.email ? (
                    <span className="small muted">You</span>
                  ) : (
                    <form action={removeMember}>
                      <input type="hidden" name="email" value={r.email} />
                      <button type="submit" className="btn danger sm">Remove</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
