import Link from "next/link";
import { ADMINS, requireRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Flash } from "@/components/flash";
import { saveDoc } from "./actions";

type Doc = { key: string; title: string; body: string; source_url: string | null; updated_by: string | null; updated_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// What the assistant knows: Campus know-how (quick local rules) and the full handbook.
export default async function AskKnowledge({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireRole(ADMINS);
  const sp = await searchParams;
  const { data } = await (await createClient()).from("hub_docs").select("*");
  const doc = (k: string) => (data ?? []).find((d: Doc) => d.key === k) as Doc | undefined;
  const notes = doc("campus_notes");
  const hb = doc("handbook");

  return (
    <main className="page stack" style={{ maxWidth: 900 }}>
      <div className="between">
        <div className="stack-sm">
          <h1>What the assistant knows</h1>
          <p className="lede">Change these and the assistant uses the new version from the very next question. Admins only.</p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Link href="/ask/insights" className="edit-toggle">Insights</Link>
          <Link href="/ask" className="edit-toggle">Ask the hub</Link>
        </div>
      </div>
      <Flash msg={sp.msg} err={sp.err} />

      <section className="card stack-sm">
        <h2 style={{ fontSize: 18 }}>Campus know-how</h2>
        <p className="small muted">Quick local rules that aren&apos;t in the handbook: backups, approvals, &ldquo;Pearl St is closed this week&rdquo;. One line per rule, under a heading. These win over the handbook when they disagree.</p>
        <form action={saveDoc} className="stack-sm">
          <input type="hidden" name="key" value="campus_notes" />
          <textarea name="body" className="input kb-text" rows={18} defaultValue={notes?.body ?? ""} />
          <div className="between">
            <span className="small muted">{notes ? `Last saved ${when(notes.updated_at)}${notes.updated_by ? ` by ${notes.updated_by}` : ""}` : "Not set yet"}</span>
            <button type="submit" className="btn">Save know-how</button>
          </div>
        </form>
      </section>

      <section className="card stack-sm">
        <h2 style={{ fontSize: 18 }}>Policies and Procedures handbook</h2>
        <p className="small muted">
          To update it: in Google Docs choose <b>File → Download → Plain text</b> (or select all and copy), paste it below, and save.
          The section links at the top let answers jump to the right part of the Google Doc; keep them if the headings haven&apos;t changed, or ask Claude to rebuild them.
        </p>
        <form action={saveDoc} className="stack-sm">
          <input type="hidden" name="key" value="handbook" />
          <input name="source_url" className="input" placeholder="Google Doc link" defaultValue={hb?.source_url ?? ""} />
          <textarea name="body" className="input kb-text" rows={14} defaultValue={hb?.body ?? ""} />
          <div className="between">
            <span className="small muted">{hb ? `Last saved ${when(hb.updated_at)}${hb.updated_by ? ` by ${hb.updated_by}` : ""} · ${Math.round(hb.body.length / 1000)}k characters` : "Not loaded yet"}</span>
            <button type="submit" className="btn">Save handbook</button>
          </div>
        </form>
      </section>
    </main>
  );
}
