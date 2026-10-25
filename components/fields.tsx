import { CAMPUSES } from "@/lib/campus";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };

export function Field({ label, name, id, ...rest }: InputProps) {
  const fid = id ?? `f-${name}-${rest.defaultValue ?? "new"}`;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      <input id={fid} name={name} className="input" {...rest} />
    </div>
  );
}

export function TextArea({ label, name, id, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  const fid = id ?? `f-${name}`;
  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label htmlFor={fid}>{label}</label>
      <textarea id={fid} name={name} className="input" {...rest} />
    </div>
  );
}

export function CampusSelect({ id, defaultValue = "all", allowBoth = true }: { id: string; defaultValue?: string; allowBoth?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>Campus</label>
      <select id={id} name="campus" className="input" defaultValue={defaultValue}>
        {allowBoth && <option value="all">Both campuses</option>}
        {CAMPUSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}
