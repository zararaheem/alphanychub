import { parseProcedure, type ProcKind } from "@/lib/procedure-meta";

export function ProcedureBody({ body }: { body: string }) {
  const blocks = parseProcedure(body);
  let inWarn = false;
  return (
    <div className="proc-doc">
      {blocks.map((b, i) => {
        if (b.type === "heading") inWarn = b.warn;
        const warn = inWarn && b.type !== "heading";
        switch (b.type) {
          case "lead":
            return <p key={i} className="proc-lead">{b.text}</p>;
          case "heading":
            return <h3 key={i} className={b.warn ? "proc-h warn" : "proc-h"}>{b.text}</h3>;
          case "steps":
            return (
              <ol key={i} className="proc-steps">
                {b.items.map((t, j) => <li key={j}><span className="n">{j + 1}</span><span>{t}</span></li>)}
              </ol>
            );
          case "bullets":
            return (
              <ul key={i} className={warn ? "proc-bullets warn" : "proc-bullets"}>
                {b.items.map((t, j) => <li key={j}>{t}</li>)}
              </ul>
            );
          default:
            return <p key={i} className="proc-para">{b.text}</p>;
        }
      })}
    </div>
  );
}

const PATHS: Record<ProcKind, string> = {
  fire: "M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8zM6 14a6 6 0 0 0 12 0",
  medical: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
  lockdown: "M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5zM12 15v3",
  weather: "M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8zM9 21l1-2M13 21l1-2",
  bomb: "M12 3v4M12 17v4M3 12h4M17 12h4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  gas: "M12 3l9 16H3zM12 10v4M12 17v.5",
  info: "M12 8v.5M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
};

export function ProcIcon({ kind, size = 22 }: { kind: ProcKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[kind]} />
    </svg>
  );
}
