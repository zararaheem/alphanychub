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
        <span className="kicker">Alpha NYC · One-pager</span>
        <h1>{title}</h1>
        <p className="lede">{intro}</p>
      </header>
      {children}
      <p className="sheet-source">Source: {source}</p>
    </main>
  );
}

function Section({ s }: { s: GuideSection }) {
  return (
    <section className={`sheet-sec${s.tone === "warn" ? " warn" : ""}${s.todo ? " todo" : ""}`}>
      <h2>{s.heading}</h2>
      {s.text && <p>{s.text}</p>}
      {s.steps && <ol className="sheet-steps">{s.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {s.bullets && <ul>{s.bullets.map((t) => <li key={t}>{t}</li>)}</ul>}
      {s.todo && <p className="todo-note">To add: {s.todo}</p>}
    </section>
  );
}

async function EmergencySheet() {
  const [procs, contacts] = await Promise.all([getProcedures(null), getContacts(null)]);
  const respond = procs.filter(isRespondNow);
  const phones = contacts.filter((c) => c.phone && c.phone !== "911").slice(0, 6);
  const leads = contacts.filter((c) => /coordinator|lead guard/i.test(c.role ?? ""));
  return (
    <Sheet title="Emergency procedures" intro="Call 911 first in any life-threatening emergency." source="Alpha NYC Emergency Action Plan · live contacts in the hub">
      <section className="sheet-sec warn">
        <h2>First 60 seconds</h2>
        <ol className="sheet-steps">
          <li>Call <b>911</b> if anyone is in danger.</li>
          <li>Everyone switches to radio <b>Channel 2</b>.</li>
          <li>Notify the Emergency Coordinator{leads[0] ? ` (${leads[0].name})` : ""}.</li>
        </ol>
        <p><b>Lockdown code: &lsquo;Tiger, Tiger&rsquo;</b> — act immediately, no confirmation needed.</p>
      </section>
      <div className="sheet-grid dense">
        {respond.map((p) => {
          const blocks = parseProcedure(p.body);
          const lead = blocks.find((b) => b.type === "lead");
          const steps = blocks.find((b) => b.type === "steps");
          const dont = blocks.findIndex((b) => b.type === "heading" && b.warn);
          const dontList = dont >= 0 ? blocks[dont + 1] : undefined;
          const bullets = !steps ? blocks.find((b) => b.type === "bullets") : undefined;
          return (
            <section key={p.id} className="sheet-sec">
              <h2>{shortTitle(p.title)}</h2>
              {lead && lead.type === "lead" && <p className="sheet-lead">{lead.text}</p>}
              {steps && steps.type === "steps" && <ol className="sheet-steps">{steps.items.map((t) => <li key={t}>{t}</li>)}</ol>}
              {bullets && bullets.type === "bullets" && <ul>{bullets.items.map((t) => <li key={t}>{t}</li>)}</ul>}
              {dontList && dontList.type === "bullets" && (
                <p className="sheet-dont"><b>Do NOT:</b> {dontList.items.join(" · ")}</p>
              )}
            </section>
          );
        })}
        <section className="sheet-sec">
          <h2>Assembly areas</h2>
          <ul>
            <li><b>Primary:</b> South Street Seaport on Fulton St (between Front St &amp; South St)</li>
            <li><b>Secondary:</b> Louise Nevelson Plaza at William St (between Maiden Ln &amp; Liberty St)</li>
            <li>Report headcount to the Coordinator within 3 minutes</li>
          </ul>
        </section>
        <section className="sheet-sec">
          <h2>Key numbers</h2>
          <ul>
            <li><b>Emergency:</b> 911</li>
            {phones.map((c) => <li key={c.id}><b>{c.name}:</b> {c.phone}</li>)}
            {leads.map((c) => <li key={c.id}><b>{c.name}</b> · {c.role?.split("·")[0].trim()}</li>)}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}
