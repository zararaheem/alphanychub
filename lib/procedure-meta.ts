import type { Procedure } from "@/lib/types";

export type ProcKind = "fire" | "medical" | "lockdown" | "weather" | "bomb" | "gas" | "info";

// "Respond now" procedures are the ones staff open mid-emergency; the rest
// are reference. Order 10–19 (as set on each procedure) means respond now.
export const isRespondNow = (p: Procedure) => p.sort >= 10 && p.sort < 20;

export function procKind(title: string): ProcKind {
  const t = title.toLowerCase();
  if (t.includes("fire") && !t.includes("equipment")) return "fire";
  if (t.includes("medical")) return "medical";
  if (t.includes("lockdown") || t.includes("threat") && !t.includes("bomb")) return "lockdown";
  if (t.includes("weather") || t.includes("utility")) return "weather";
  if (t.includes("bomb")) return "bomb";
  if (t.includes("gas") || t.includes("hazard")) return "gas";
  return "info";
}

// Short tile label, e.g. "Lockdown: active threat / intruder" → "Lockdown".
export const shortTitle = (title: string) => title.split(/[:/(]/)[0].replace(/emergency$/i, "").trim();

export type Block =
  | { type: "lead"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "heading"; text: string; warn: boolean }
  | { type: "para"; text: string };

// Turns a procedure's plain text into structure: numbered lines become
// steps, "•" lines bullets, short label lines headings, and the opening
// paragraph a lead summary.
export function parseProcedure(body: string): Block[] {
  const blocks: Block[] = [];
  const paras = body.replace(/\r/g, "").split(/\n\s*\n/);
  paras.forEach((para, pi) => {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\d+[.)]\s/.test(l)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)]\s+/, ""));
        blocks.push({ type: "steps", items });
      } else if (/^[•\-–*]\s/.test(l)) {
        const items: string[] = [];
        while (i < lines.length && /^[•\-–*]\s/.test(lines[i])) items.push(lines[i++].replace(/^[•\-–*]\s+/, ""));
        blocks.push({ type: "bullets", items });
      } else if (l.length <= 60 && !/[.!?]$/.test(l) && i + 1 < lines.length) {
        blocks.push({ type: "heading", text: l, warn: /\bdo not\b/i.test(l) });
        i++;
      } else {
        blocks.push({ type: pi === 0 && blocks.length === 0 ? "lead" : "para", text: l });
        i++;
      }
    }
  });
  return blocks;
}
