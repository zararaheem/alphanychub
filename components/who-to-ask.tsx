import { WHO_TO_ASK } from "@/lib/who-to-ask";

export function WhoToAsk({ compact = false }: { compact?: boolean }) {
  const rows = compact ? WHO_TO_ASK.slice(0, 8) : WHO_TO_ASK;
  return (
    <ul className={`who-ask${compact ? " compact" : ""}`}>
      {rows.map((r) => (
        <li key={r.topic}>
          <span>{r.topic}</span>
          <b>{r.who}</b>
        </li>
      ))}
    </ul>
  );
}
