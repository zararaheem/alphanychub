import Link from "next/link";
import { EDITORS, requireRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { checkWith, normalize, topicLabel, topicOf } from "@/lib/ask-topics";

type Row = {
  id: number; created_at: string; question: string; answer: string | null; answered: boolean | null;
  helpful: boolean | null; topic: string | null; check_with: string[] | null; feedback: string | null; email: string;
};
type SP = Promise<{ days?: string }>;

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

// What staff ask the hub assistant: volume, top topics and questions, who answers
// get sent to, and the gaps and feedback to act on. Askers stay anonymous here.
export default async function AskInsights({ searchParams }: { searchParams: SP }) {
  await requireRole(EDITORS);
  const sp = await searchParams;
  const days = ["7", "30", "90"].includes(sp.days ?? "") ? Number(sp.days) : 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const supabase = await createClient();
  const { data } = await supabase.from("ask_log")
    .select("id, created_at, question, answer, answered, helpful, topic, check_with, feedback, email")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, topic: r.topic ?? topicOf(r.question), check_with: r.check_with ?? checkWith(r.answer) }));

  const total = rows.length;
  const askers = new Set(rows.map((r) => r.email)).size;
  const covered = rows.filter((r) => r.answered !== false).length;
  const rated = rows.filter((r) => r.helpful !== null);
  const up = rated.filter((r) => r.helpful).length;

  const count = <K extends string>(keys: K[]) => {
    const m = new Map<K, number>();
    keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const topics = count(rows.map((r) => r.topic!)).map(([id, n]) => {
    const mine = rows.filter((r) => r.topic === id);
    return { id, n, up: mine.filter((r) => r.helpful === true).length, down: mine.filter((r) => r.helpful === false).length, gaps: mine.filter((r) => r.answered === false).length };
  });
  const maxTopic = topics[0]?.n ?? 1;

  // Most asked: the same question in different words still counts once per wording.
  const byQ = new Map<string, { text: string; n: number; topic: string; last: string }>();
  rows.forEach((r) => {
    const k = normalize(r.question);
    const cur = byQ.get(k);
    if (cur) cur.n++; else byQ.set(k, { text: r.question, n: 1, topic: r.topic!, last: r.created_at });
  });
  const top = [...byQ.values()].sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 15);

  const people = count(rows.flatMap((r) => r.check_with ?? []));
  const needs = rows.filter((r) => r.answered === false || r.helpful === false || r.feedback);

  // Questions per week, oldest first.
  const weeks = count(rows.map((r) => {
    const d = new Date(r.created_at); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  })).sort((a, b) => a[0].localeCompare(b[0]));
  const maxWeek = Math.max(1, ...weeks.map((w) => w[1]));

  return (
    <main className="page stack" style={{ maxWidth: 960 }}>
      <div className="between">
        <div className="stack-sm">
          <h1>Ask the hub: insights</h1>
          <p className="lede">What staff ask the assistant, what it answers well, and what it needs. Askers aren&apos;t named here.</p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {[7, 30, 90].map((d) => <Link key={d} href={`/ask/insights?days=${d}`} className={`btn sm ${d === days ? "" : "outline"}`}>{d} days</Link>)}
        </div>
      </div>

      <div className="ins-stats">
        <div><b>{total}</b><span>questions</span></div>
        <div><b>{askers}</b><span>staff asking</span></div>
        <div><b>{pct(covered, total)}</b><span>covered by the policies</span></div>
        <div><b>{pct(up, rated.length)}</b><span>rated helpful ({rated.length} rated)</span></div>
      </div>

      {total === 0 ? (
        <p className="notice">No questions in the last {days} days yet. As staff use <Link href="/ask">Ask the hub</Link>, this fills in.</p>
      ) : (
        <>
          {weeks.length > 1 && (
            <section className="card stack-sm">
              <h2 className="ins-h">Questions per week</h2>
              <ul className="ins-bars">
                {weeks.map(([w, n]) => (
                  <li key={w}><span>Week of {new Date(w).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span><i style={{ width: `${(n / maxWeek) * 100}%` }} /><b>{n}</b></li>
                ))}
              </ul>
            </section>
          )}

          <div className="ins-two">
            <section className="card stack-sm">
              <h2 className="ins-h">Top topics</h2>
              <ul className="ins-bars">
                {topics.map((t) => (
                  <li key={t.id}>
                    <span>{topicLabel(t.id)}</span><i style={{ width: `${(t.n / maxTopic) * 100}%` }} /><b>{t.n}</b>
                    <em className="small muted">{t.up ? `👍${t.up} ` : ""}{t.down ? `👎${t.down} ` : ""}{t.gaps ? `· ${t.gaps} not covered` : ""}</em>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card stack-sm">
              <h2 className="ins-h">Who answers get sent to</h2>
              {people.length === 0 ? <p className="small muted">Nobody yet.</p> : (
                <ul className="ins-bars">
                  {people.map(([who, n]) => <li key={who}><span>{who}</span><i style={{ width: `${(n / (people[0][1] || 1)) * 100}%` }} /><b>{n}</b></li>)}
                </ul>
              )}
              <p className="small muted">How often each person is named under &ldquo;Check with&rdquo;: a rough guide to who carries the questions.</p>
            </section>
          </div>

          <section className="card stack-sm">
            <h2 className="ins-h">Most asked questions</h2>
            <ol className="ins-list">
              {top.map((q, i) => (
                <li key={i}><span>{q.text}</span><span className="small muted">{topicLabel(q.topic)}{q.n > 1 ? ` · asked ${q.n}×` : ""}</span></li>
              ))}
            </ol>
          </section>

          <section className="card stack-sm">
            <h2 className="ins-h">Needs attention ({needs.length})</h2>
            <p className="small muted">Questions the policies didn&apos;t cover, answers marked 👎, and notes staff left. Each one is something to add to the handbook or Campus know-how.</p>
            {needs.length === 0 ? <p className="small">Nothing flagged. 🎉</p> : (
              <ul className="ins-needs">
                {needs.slice(0, 40).map((r) => (
                  <li key={r.id}>
                    <div className="between" style={{ gap: 8 }}>
                      <b>{r.question}</b>
                      <span className="small muted" style={{ whiteSpace: "nowrap" }}>{when(r.created_at)}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {r.answered === false && <span className="pill amber">Not covered</span>}
                      {r.helpful === false && <span className="pill">👎 Not helpful</span>}
                      {r.helpful === true && <span className="pill mint">👍 Helpful</span>}
                      <span className="small muted">{topicLabel(r.topic)}</span>
                    </div>
                    {r.feedback && <p className="ins-quote">&ldquo;{r.feedback}&rdquo;</p>}
                    {r.answer && (
                      <details><summary className="small">See the answer it gave</summary><p className="small" style={{ whiteSpace: "pre-wrap" }}>{r.answer}</p></details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
