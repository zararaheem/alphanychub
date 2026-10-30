import type { RequestKind } from "@/lib/requests";

// One request form, built from its field list. Used by the Parent Hub and the staff hub.
export function RequestForm({ kind, action, students, campusPicker }: {
  kind: RequestKind;
  action: (form: FormData) => Promise<void>;
  students?: { student: string; campus: string }[];
  campusPicker?: boolean;
}) {
  return (
    <form action={action} className="card req-form">
      <input type="hidden" name="kind" value={kind.id} />
      {kind.note && <p className="notice warn">{kind.note}</p>}
      {students && students.length > 1 && (
        <div className="field">
          <label htmlFor="rf-student">Child</label>
          <select id="rf-student" name="student" className="input" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {students.map((c) => <option key={c.student} value={c.student}>{c.student}</option>)}
          </select>
        </div>
      )}
      {students?.length === 1 && <input type="hidden" name="student" value={students[0].student} />}
      {campusPicker && (
        <div className="field">
          <label htmlFor="rf-campus">Campus</label>
          <select id="rf-campus" name="campus" className="input" defaultValue="">
            <option value="">Both / not sure</option>
            <option value="maiden-ln">Maiden Ln</option>
            <option value="early-years">Early Years</option>
          </select>
        </div>
      )}
      {kind.fields.map((f) => {
        const id = `rf-${f.name}`;
        const label = <label htmlFor={id}>{f.label}{f.required ? "" : <span className="muted"> (optional)</span>}</label>;
        return (
          <div className="field" key={f.name}>
            {label}
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} className="input" rows={4} required={f.required} placeholder={f.placeholder} maxLength={2000} />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} className="input" required={f.required} defaultValue={f.required ? "" : f.options?.[0]}>
                {f.required && <option value="" disabled>Choose…</option>}
                {f.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type ?? "text"} className="input" required={f.required} placeholder={f.placeholder} maxLength={200} />
            )}
          </div>
        );
      })}
      <button type="submit" className="btn" style={{ minHeight: 48 }}>Send</button>
    </form>
  );
}
