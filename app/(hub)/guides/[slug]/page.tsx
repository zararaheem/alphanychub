import Link from "next/link";
import { notFound } from "next/navigation";
import { getContacts, getProcedures, getStaff } from "@/lib/data";
import { GUIDES, type GuideSection } from "@/lib/guides";
import { isRespondNow, parseProcedure, shortTitle } from "@/lib/procedure-meta";
import { PrintButton } from "@/components/print-button";
import { CampusToggle } from "@/components/campus-toggle";
import { CAMPUSES, type Campus } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "emergency") return <EmergencySheet />;
  const g = GUIDES[slug];
  if (!g) notFound();
  return (
    <Sheet title={g.title} intro={g.intro} source={g.source}>
      {g.links && (
        <nav className="sheet-links" aria-label="Tools">
          <span>Open:</span>
          {g.links.map((l) => <ExtLink key={l.href} l={l} />)}
        </nav>
      )}
      <div className="sheet-grid">
        {g.sections.map((s) => <Section key={s.heading} s={s} />)}
      </div>
    </Sheet>
  );
}

function Sheet({ title, intro, source, children, campus }: { title: string; intro: string; source: string; children: React.ReactNode; campus?: Campus | null }) {
  const here = campus ? CAMPUSES.find((c) => c.id === campus) : null;
  return (
    <main className="page sheet">
      <div className="between no-print" style={{ alignItems: "center" }}>
        <Link href="/guides" className="back-link">← Resources</Link>
        <div className="row" style={{ gap: 10 }}>
          {campus !== undefined && <CampusToggle current={campus} />}
          <PrintButton />
        </div>
      </div>
      <header className="sheet-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="kicker">Alpha NYC · Staff one-pager{campus !== undefined ? ` · ${here ? `${here.name} campus` : "Both campuses"}` : ""}</span>
          <h1>{title}</h1>
        </div>
        <p className="sheet-intro">{intro}</p>
      </header>
      {children}
      <footer className="sheet-foot">
        <span>Source: {source}</span>
        <span>Printed {printed()}</span>
      </footer>
    </main>
  );
}

const printed = () =>
  new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

function Section({ s }: { s: GuideSection }) {
  return (
    <section className={`sheet-sec${s.tone === "warn" ? " warn" : ""}${s.todo ? " todo" : ""}${s.table ? " wide" : ""}`}>
      <h2>{s.heading}</h2>
      {s.steps && <ol className="sheet-steps">{s.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {s.bullets && <ul className="sheet-list">{s.bullets.map((t) => <li key={t}>{t}</li>)}</ul>}
      {s.table && <Table head={s.table.head} rows={s.table.rows} />}
      {s.checklist && (
        <table className="sheet-table checklist-table">
          <thead><tr><th scope="col" className="box-col"><span className="sr-only">Done</span></th><th scope="col">Check</th><th scope="col">Who helps</th></tr></thead>
          <tbody>
            {s.checklist.map((c) => (
              <tr key={c.n}>
                <td className="box-col"><span className="tick-box" aria-hidden="true" /></td>
                <td>
                  <span className="check-q">{c.n}. {c.check}</span>
                  {c.how && <span className="check-how">{c.how}{c.link && <> <ExtLink l={c.link} arrow /></>}</span>}
                </td>
                <td className="nowrap"><b>{c.who}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {s.text && <p className="sheet-note">{s.text}</p>}
      {s.todo && <p className="todo-note"><b>To add</b> {s.todo}</p>}
    </section>
  );
}

function Table({ head, rows }: { head?: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="sheet-table">
      {head && <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>}
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "string" && c.length <= 12 ? "nowrap" : undefined}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

function ExtLink({ l, arrow }: { l: { label: string; href: string }; arrow?: boolean }) {
  const external = /^https?:/.test(l.href);
  return (
    <a href={l.href} className={arrow ? "check-link" : "sheet-link"} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {l.label}{arrow ? " →" : external ? " ↗" : ""}
    </a>
  );
}

// Three explicit columns, balanced by rough text length.
// CSS columns don't survive printing on iPhones (the sheet ran to 3 pages).
function SheetColumns({ items, count = 3 }: { items: { weight: number; node: React.ReactNode }[]; count?: number }) {
  // Each section goes to the shortest column so far (keeps the sheet to one page).
  const cols: React.ReactNode[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);
  for (const item of items) {
    const col = heights.indexOf(Math.min(...heights));
    cols[col].push(item.node);
    heights[col] += item.weight;
  }
  return <div className="sheet-cols">{cols.map((c, i) => <div key={i} className="sheet-col">{c}</div>)}</div>;
}

const CALL_LIST = ["Derek", "Drew", "Emily", "Nancy", "Tasha", "Terrence", "Zara"];

const tel = (phone: string) => <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>;

async function EmergencySheet() {
  const campus = await currentCampus();
  const [procs, contacts, staff] = await Promise.all([getProcedures(campus), getContacts(campus), getStaff(null)]);
  const respond = procs.filter(isRespondNow);
  // Who to call, by phone, in this order (from the staff directory).
  const callList = CALL_LIST.flatMap((first) => {
    const match = (n: string) => n.toLowerCase().startsWith(first.toLowerCase() + " ");
    const s = staff.find((p) => match(p.name));
    const c = contacts.find((p) => match(p.name));
    const phone = s?.phone ?? c?.phone ?? null;
    const email = s?.email ?? c?.email ?? null;
    if (!s && !c) return [];
    // Short title: first part only ("Dean of Parents (DOP) · Parent & ..." → "Dean of Parents (DOP)").
    const title = (s?.title ?? c?.role ?? "").split("·")[0].trim();
    return [{ key: s?.id ?? c?.id ?? first, name: s?.name ?? c!.name, title, phone, email }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  const searchers = contacts.filter((c) => /searcher/i.test(c.role ?? "")).map((c) => c.name).join(" and ");
  return (
    <Sheet campus={campus} title="Emergency procedures" intro="Call 911 first in any life-threatening emergency." source="Alpha NYC Emergency Action Plan · live contacts in the hub">
      {campus === "early-years" && (
        <p className="sheet-progress"><b>Early Years / William St plan is in progress.</b> Steps below follow the current Emergency Action Plan; William St assembly areas and building contacts are still being confirmed.</p>
      )}
      <section className="sheet-first">
        <h2>First 60 seconds</h2>
        <ol>
          <li><span><b>Call 911</b> if anyone is in danger</span></li>
          <li><span>Alert everyone on your <b>radio</b> (alt: <b>Zello</b>)</span></li>
          <li><span>Notify the <b>Emergency Coordinator</b></span></li>
        </ol>
        <p><b>&lsquo;Tiger, Tiger&rsquo;</b> = lockdown. Act immediately, no confirmation needed.</p>
      </section>
      <section className="sheet-rules" aria-labelledby="rules-h">
        <h2 id="rules-h">Golden rules</h2>
        <ul>
          <li><b>Never go back for anything.</b> Leave bags, phones and belongings behind.</li>
          <li><b>Don&apos;t go looking for a missing child</b> (bathroom, another room). Leave with your group and report them to the Coordinator or security immediately.</li>
          <li><b>Searchers find missing students.</b> {searchers ? `Floor Wardens ${searchers} clear rooms; ` : "Floor Wardens clear rooms; "}Guards sweep every room and restroom.</li>
          <li><b>Always know who&apos;s out of your room.</b> Account for any student who steps out.</li>
          <li><b>Never use the elevators.</b> {campus === "early-years" ? "Stairwells only." : "Stairwells F or G only."}</li>
          <li><b>Go to the nearest safe room.</b> Don&apos;t cross the floor to reach a specific one.</li>
          <li><b>Headcount within 3 minutes</b> of reaching the assembly area. Stay with your group.</li>
          <li><b>Wait for the official all-clear.</b> Never re-enter on your own or open a locked door without law enforcement.</li>
        </ul>
      </section>
      <SheetColumns items={[
        ...respond.map((p) => {
          const blocks = parseProcedure(p.body);
          const lead = blocks.find((b) => b.type === "lead");
          const steps = blocks.find((b) => b.type === "steps");
          const dont = blocks.findIndex((b) => b.type === "heading" && b.warn);
          const dontList = dont >= 0 ? blocks[dont + 1] : undefined;
          const bullets = !steps ? blocks.find((b) => b.type === "bullets") : undefined;
          // Arrow-chain summaries repeat the numbered steps, so skip them when steps exist.
          const showLead = lead?.type === "lead" && !(steps && lead.text.includes("→"));
          const lines = [
            ...(showLead && lead?.type === "lead" ? [lead.text] : []),
            ...(steps?.type === "steps" ? steps.items : []),
            ...(bullets?.type === "bullets" ? bullets.items : []),
            ...(dontList?.type === "bullets" ? dontList.items : []),
          ];
          return {
            weight: 40 + lines.reduce((n, t) => n + 20 + t.length, 0),
            node: (
              <section key={p.id} className="sheet-sec">
                <h2>{shortTitle(p.title)}</h2>
                {showLead && lead?.type === "lead" && <p className="sheet-lead">{lead.text}</p>}
                {steps?.type === "steps" && <ol className="sheet-steps">{steps.items.map((t) => <li key={t}>{t}</li>)}</ol>}
                {bullets?.type === "bullets" && <ul className="sheet-list">{bullets.items.map((t) => <li key={t}>{t}</li>)}</ul>}
                {dontList?.type === "bullets" && (
                  <div className="sheet-dont">
                    <b>Do not</b>
                    <ul>{dontList.items.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
              </section>
            ),
          };
        }),
        {
          weight: 300,
          node: (
            <section key="assembly" className={`sheet-sec${campus === "early-years" ? " todo" : ""}`}>
              <h2>Assembly areas{campus === null ? " · Maiden Ln" : ""}</h2>
              {campus === "early-years" ? (
                <p className="todo-note"><b>In progress</b> William St assembly areas are being confirmed.</p>
              ) : (
                <>
                  <Table rows={[
                    [<b key="p">Primary</b>, "South Street Seaport, Fulton St (Front St – South St)"],
                    [<b key="s">Secondary</b>, "Louise Nevelson Plaza, William St (Maiden Ln – Liberty St)"],
                  ]} />
                  <p className="sheet-note">Report headcount to the Coordinator within 3 minutes.</p>
                </>
              )}
            </section>
          ),
        },
        {
          weight: 90 + 70 * (callList.length + 1),
          node: (
            <section key="call" className="sheet-sec">
              <h2>Who to call</h2>
              <Table rows={[
                [<b key="e">Emergency</b>, "", tel("911")],
                ...callList.map((p) => [<b key={p.key}>{p.name}</b>, p.title, p.phone ? tel(p.phone) : p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : ""]),
              ]} />
            </section>
          ),
        },
      ]} />
    </Sheet>
  );
}
