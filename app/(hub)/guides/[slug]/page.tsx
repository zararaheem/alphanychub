import Link from "next/link";
import { notFound } from "next/navigation";
import { getContacts, getProcedures } from "@/lib/data";
import { GUIDES, type GuideSection } from "@/lib/guides";
import { isRespondNow, parseProcedure, shortTitle } from "@/lib/procedure-meta";
import { PrintButton } from "@/components/print-button";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "emergency") return <EmergencySheet />;
  const g = GUIDES[slug];
  if (!g) notFound();
  return (
    <Sheet title={g.title} intro={g.intro} source={g.source}>
      <div className="sheet-grid">
        {g.sections.map((s) => <Section key={s.heading} s={s} />)}
      </div>
    </Sheet>
  );
}

function Sheet({ title, intro, source, children }: { title: string; intro: string; source: string; children: React.ReactNode }) {
  return (
    <main className="page sheet">
      <div className="between no-print" style={{ alignItems: "center" }}>
        <Link href="/guides" className="back-link">← One-pagers</Link>
        <PrintButton />
      </div>
      <header className="sheet-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="kicker">Alpha NYC · Staff one-pager</span>
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
      {s.text && <p className="sheet-note">{s.text}</p>}
      {s.todo && <p className="todo-note"><b>To add</b> {s.todo}</p>}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="sheet-table">
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

const tel = (phone: string) => <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>;

async function EmergencySheet() {
  const [procs, contacts] = await Promise.all([getProcedures(null), getContacts(null)]);
  const respond = procs.filter(isRespondNow);
  const phones = contacts.filter((c) => c.phone && c.phone !== "911").slice(0, 6);
  const leads = contacts.filter((c) => /coordinator|lead guard/i.test(c.role ?? ""));
  return (
    <Sheet title="Emergency procedures" intro="Call 911 first in any life-threatening emergency." source="Alpha NYC Emergency Action Plan · live contacts in the hub">
      <section className="sheet-first">
        <h2>First 60 seconds</h2>
        <ol>
          <li><b>Call 911</b> if anyone is in danger</li>
          <li>Switch radios to <b>Channel 2</b></li>
          <li>Notify the <b>Emergency Coordinator</b>{leads[0] ? ` (${leads[0].name})` : ""}</li>
        </ol>
        <p><b>&lsquo;Tiger, Tiger&rsquo;</b> = lockdown. Act immediately, no confirmation needed.</p>
      </section>
      <div className="sheet-grid dense">
        {respond.map((p) => {
          const blocks = parseProcedure(p.body);
          const lead = blocks.find((b) => b.type === "lead");
          const steps = blocks.find((b) => b.type === "steps");
          const dont = blocks.findIndex((b) => b.type === "heading" && b.warn);
          const dontList = dont >= 0 ? blocks[dont + 1] : undefined;
          const bullets = !steps ? blocks.find((b) => b.type === "bullets") : undefined;
          // Arrow-chain summaries repeat the numbered steps, so skip them when steps exist.
          const showLead = lead?.type === "lead" && !(steps && lead.text.includes("→"));
          return (
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
          );
        })}
        <section className="sheet-sec">
          <h2>Assembly areas</h2>
          <Table head={["", "Where"]} rows={[
            [<b key="p">Primary</b>, "South Street Seaport, Fulton St (Front St – South St)"],
            [<b key="s">Secondary</b>, "Louise Nevelson Plaza, William St (Maiden Ln – Liberty St)"],
          ]} />
          <p className="sheet-note">Report headcount to the Coordinator within 3 minutes.</p>
        </section>
        <section className="sheet-sec">
          <h2>Key numbers</h2>
          <Table head={["Who", "Number"]} rows={[
            [<b key="e">Emergency</b>, tel("911")],
            ...phones.map((c) => [c.name, tel(c.phone!)]),
          ]} />
        </section>
        {leads.length > 0 && (
          <section className="sheet-sec">
            <h2>Emergency team</h2>
            <Table head={["Name", "Role"]} rows={leads.map((c) => [<b key={c.id}>{c.name}</b>, c.role?.split("·")[0].trim() ?? ""])} />
          </section>
        )}
      </div>
    </Sheet>
  );
}
