import Link from "next/link";
import { canEdit, requireMember } from "@/lib/access";
import { REQUEST_KINDS, campusLabel, kindById } from "@/lib/requests";
import { submitStaffRequest, updateRequest } from "@/lib/request-actions";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "@/components/request-form";
import { Flash } from "@/components/flash";

type Req = {
  id: number; created_at: string; source: string; kind: string; campus: string | null; student: string | null;
  from_name: string | null; from_email: string; details: Record<string, string>; route_to: string | null;
  status: string; staff_note: string | null; updated_by: string | null;
};
type Asked = { id: number; created_at: string; email: string; question: string; answered: boolean; helpful: boolean | null };

const STATUS: Record<string, [string, string]> = { new: ["New", "pill red"], "in-progress": ["In progress", "pill amber"], done: ["Done", "pill mint"] };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

const STOP = new Set("a an and are as at be by can do does for from get how i if in is it me my of on or the to we what when where who why with you your there this that should need have about".split(" "));
function topWords(qs: string[], n = 12) {
  const counts = new Map<string, number>();
  for (const q of qs) for (const w of new Set(q.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/))) if (w.length > 2 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ show?: string; from?: string; new?: string; msg?: string; err?: string }> }) {
  const me = await requireMember();
  const editor = canEdit(me.role);
  const sp = await searchParams;
  const show = sp.show === "done" || sp.show === "all" ? sp.show : "open";
  const from = sp.from === "parent" || sp.from === "staff" ? sp.from : "all";
  const supabase = await createClient();

  let q = supabase.from("requests").select("*").order("created_at", { ascending: false }).limit(100);
  if (!editor) q = q.eq("from_email", me.email);
  if (show === "open") q = q.neq("status", "done");
  if (show === "done") q = q.eq("status", "done");
  if (from === "parent") q = q.in("source", ["parent", "preview"]);
  if (from === "staff") q = q.eq("source", "staff");
  const [{ data: reqData, error: reqError }, asked] = await Promise.all([
    q,
    editor ? supabase.from("ask_log").select("id, created_at, email, question, answered, helpful").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: null }),
  ]);
  const requests = (reqData ?? []) as Req[];
  const questions = (asked.data ?? []) as Asked[];
  const flagged = questions.filter((x) => !x.answered || x.helpful === false);
  const staffKinds = REQUEST_KINDS.filter((k) => k.audience === "staff");
  const openKind = sp.new ? kindById(sp.new) : null;
  const here = `/requests?show=${show}&from=${from}`;
  const filter = (key: "show" | "from", value: string, label: string) => {
    const cur = key === "show" ? show : from;
    const href = key === "show" ? `/requests?show=${value}&from=${from}` : `/requests?show=${show}&from=${value}`;
    return <Link key={value} href={href} className={`btn sm ${cur === value ? "" : "outline"}`}>{label}</Link>;
  };

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Requests{editor ? " & questions" : ""}</h1>
        <p className="lede">
          {editor
            ? "Everything families send from the Parent Hub, staff requests, and what people ask the hub assistant. New requests also post to Slack."
            : "Ask leadership for something, or tell us what's missing in the hub. The right person gets it on Slack."}
        </p>
      </div>
      <Flash msg={sp.msg} err={sp.err} />
      {reqError && <p className="notice warn">Requests aren&apos;t switched on yet (the database table still needs to be created).</p>}

      <section className="stack">
        <h2>Send a request</h2>
        <div className="row">
          {staffKinds.map((k) => (
            <Link key={k.id} href={`/requests?new=${k.id}#form`} className={`btn sm ${openKind?.id === k.id ? "" : "outline"}`}>{k.title}</Link>
          ))}
          <Link href="/parents" className="btn sm ghost">Preview the Parent Hub ↗</Link>
        </div>
        {openKind?.audience === "staff" && (
          <div id="form" className="req-narrow">
            <p className="small muted">{openKind.blurb}</p>
            <RequestForm kind={openKind} action={submitStaffRequest} campusPicker />
          </div>
        )}
      </section>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{editor ? "Inbox" : "Your requests"}</h2>
          <div className="row">
            {filter("show", "open", "Open")}{filter("show", "done", "Done")}{filter("show", "all", "All")}
            {editor && <>{filter("from", "all", "Everyone")}{filter("from", "parent", "Parents")}{filter("from", "staff", "Staff")}</>}
          </div>
        </div>
        {requests.length === 0 && !reqError && <p className="empty">Nothing here.</p>}
        {requests.map((r) => {
          const kind = kindById(r.kind);
          const [label, cls] = STATUS[r.status] ?? STATUS.new;
          return (
            <article key={r.id} id={`r${r.id}`} className="card req-card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <b>{kind?.title ?? r.kind}</b>
                  <span className={cls}>{label}</span>
                  <span className="pill">{r.source === "preview" ? "Test" : r.source === "parent" ? "Parent" : "Staff"}</span>
                </div>
                <span className="small muted">{when(r.created_at)}</span>
              </div>
              <span className="small">
                {campusLabel(r.campus)}{r.student ? ` · ${r.student}` : ""} · from {r.from_name ?? r.from_email}
                {r.route_to ? <> · for <b>{r.route_to}</b></> : null}
              </span>
              <dl className="req-details">
                {(kind?.fields ?? []).filter((f) => r.details?.[f.name]).map((f) => (
                  <div key={f.name}><dt>{f.label}</dt><dd>{r.details[f.name]}</dd></div>
                ))}
              </dl>
              {editor ? (
                <form action={updateRequest} className="row req-update">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value={here} />
                  <select name="status" className="input" defaultValue={r.status} aria-label="Status">
                    <option value="new">New</option><option value="in-progress">In progress</option><option value="done">Done</option>
                  </select>
                  <input name="staff_note" className="input" defaultValue={r.staff_note ?? ""} placeholder={r.source === "staff" ? "Note" : "Note the family will see"} aria-label="Note" />
                  <button type="submit" className="btn sm">Save</button>
                  {r.updated_by && <span className="small muted">Last: {r.updated_by}</span>}
                </form>
              ) : r.staff_note && <p className="small"><b>Reply:</b> {r.staff_note}</p>}
            </article>
          );
        })}
      </section>

      {editor && (
        <section className="stack">
          <h2>What staff ask the assistant</h2>
          {questions.length === 0 ? <p className="empty">No questions logged yet.</p> : (
            <>
              <div className="grid-sm">
                <div className="card"><span className="small muted">Questions (last 200)</span><b className="card-title">{questions.length}</b></div>
                <div className="card"><span className="small muted">Not answered by the hub</span><b className="card-title">{questions.filter((x) => !x.answered).length}</b></div>
                <div className="card"><span className="small muted">Marked not helpful</span><b className="card-title">{questions.filter((x) => x.helpful === false).length}</b></div>
              </div>
              {topWords(questions.map((x) => x.question)).length > 0 && (
                <p className="small"><b>Asked about most:</b> {topWords(questions.map((x) => x.question)).map(([w, n]) => `${w} (${n})`).join(" · ")}</p>
              )}
              {flagged.length > 0 && (
                <div className="card card-alert">
                  <b>Gaps to fix: the hub didn&apos;t answer these well</b>
                  <ul className="q-list">
                    {flagged.slice(0, 30).map((x) => (
                      <li key={x.id}><span>{x.question}</span> <span className="small muted">{!x.answered ? "no answer" : "👎"} · {when(x.created_at)}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              <details className="card">
                <summary><b>All recent questions</b></summary>
                <ul className="q-list">
                  {questions.map((x) => (
                    <li key={x.id}><span>{x.question}</span> <span className="small muted">{x.email.split("@")[0]} · {when(x.created_at)}{x.helpful === true ? " · 👍" : x.helpful === false ? " · 👎" : ""}</span></li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </section>
      )}
    </main>
  );
}
