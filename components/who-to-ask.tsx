import { EMERGENCY_NOW, WHO_BY_PERSON } from "@/lib/who-to-ask";

// Grouped by person: who they are, then what to bring them.
export function WhoToAsk({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`who-grid${compact ? " compact" : ""}`}>
      {WHO_BY_PERSON.map((p) => (
        <section key={p.who} className="who-card" aria-label={`${p.who}, ${p.role}`}>
          <header>
            <b>{p.who}</b>
            <span>{p.role}</span>
          </header>
          <ul>{p.topics.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
      <p className="who-emergency"><b>Emergency now?</b> {EMERGENCY_NOW.replace(/^Emergency happening now: /, "")}</p>
    </div>
  );
}
