import { parseCsv } from "@/lib/csv";

export type StaffRow = {
  campus: "unassigned" | "all" | "early-years" | "maiden-ln"; name: string; title: string | null; team: string | null;
  email: string | null; phone: string | null; notes: string | null; sort: number;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pick = (headers: string[], names: string[]) => headers.findIndex((h) => names.includes(h));

function campusOf(v: string | null): StaffRow["campus"] {
  const c = (v ?? "").toLowerCase();
  const early = /william|early/.test(c);
  const maiden = /maiden/.test(c);
  if (early && !maiden) return "early-years";
  if (maiden && !early) return "maiden-ln";
  return early && maiden || /both|all/.test(c) ? "all" : "unassigned";
}

// Turns a Google Sheets CSV export of the staff list into directory rows.
export function parseStaffCsv(text: string): { rows: StaffRow[]; error?: string } {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  if (table.length < 2) return { rows: [], error: "The file has no data rows." };
  const headers = table[0].map(norm);
  const iName = pick(headers, ["name", "full name", "staff", "staff name", "employee"]);
  const iFirst = pick(headers, ["first", "first name"]);
  const iLast = pick(headers, ["last", "last name", "surname"]);
  const iTitle = pick(headers, ["title", "role", "position", "job title"]);
  const iTeam = pick(headers, ["team", "level", "department", "group", "class"]);
  const iCampus = pick(headers, ["campus", "location", "site"]);
  const iEmail = pick(headers, ["email", "email address", "work email"]);
  const iPhone = pick(headers, ["phone", "phone number", "cell", "mobile"]);
  const iNotes = pick(headers, ["notes", "note"]);
  if (iName < 0 && iFirst < 0) return { rows: [], error: "Couldn't find a Name column (or First / Last name columns)." };

  const cell = (r: string[], i: number) => (i >= 0 && r[i]?.trim() ? r[i].trim() : null);
  const rows: StaffRow[] = [];
  table.slice(1).forEach((r) => {
    const name = cell(r, iName) ?? [cell(r, iFirst), cell(r, iLast)].filter(Boolean).join(" ");
    if (!name) return;
    rows.push({
      campus: campusOf(cell(r, iCampus)), name, title: cell(r, iTitle), team: cell(r, iTeam),
      email: cell(r, iEmail)?.toLowerCase() ?? null, phone: cell(r, iPhone), notes: cell(r, iNotes), sort: rows.length,
    });
  });
  if (!rows.length) return { rows, error: "No staff names found in the file." };
  return { rows };
}
