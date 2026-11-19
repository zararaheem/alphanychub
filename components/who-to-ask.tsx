import { EMERGENCY_NOW, WHO_BY_PERSON, type AskPerson } from "@/lib/who-to-ask";

// One card per person: name and role, a one-line summary of what to bring
// them, then their topics in short labelled groups. In the compact version
// (the Ask page quick list) the groups fold away behind the summary.
export function WhoToAsk({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`who-grid${compact ? " compact" : ""}`}>
      {WHO_BY_PERSON.map((p) => (
        <section key={p.who} className="who-card" aria-label={`${p.who}, ${p.role}`}>
          <header>
            <b>{p.who}</b>
            <span>{p.role}</span>
          </header>
          <p className="who-sum">{p.summary}</p>
          {compact ? (
            <details className="who-more">
              <summary>Details</summary>
              <Groups p={p} />
            </details>
          ) : <Groups p={p} />}
        </section>
      ))}
      <p className="who-emergency"><b>Emergency now?</b> {EMERGENCY_NOW.replace(/^Emergency happening now: /, "")}</p>
    </div>
  );
}

function Groups({ p }: { p: AskPerson }) {
  return (
    <div className="who-groups">
      {p.groups.map((g, i) => (
        <div key={i} className="who-g">
          {g.label && <span className="who-gl">{g.label}</span>}
          <ul>{g.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
