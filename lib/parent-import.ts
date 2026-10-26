import { parseCsv } from "@/lib/csv";

export type ParentRow = {
  campus: "early-years" | "maiden-ln"; student: string; grade: string | null; guardian: string | null;
  relationship: string | null; phone: string | null; email: string | null; notes: string | null; sort: number;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pick = (headers: string[], names: string[]) => headers.findIndex((h) => names.includes(h));

const EARLY = /^(pre ?k|prek|k|kinder|kindergarten|wonder ?lab|learning ?lab|ll|wl)$/i;

export function campusFor(grade: string | null, campus: string | null): ParentRow["campus"] {
  const c = (campus ?? "").toLowerCase();
  if (/william|early/.test(c)) return "early-years";
  if (/maiden/.test(c)) return "maiden-ln";
  return grade && EARLY.test(grade.trim().replace(/[-.]/g, " ").replace(/\s+/g, " ")) ? "early-years" : "maiden-ln";
}

export function gradeRank(grade: string | null) {
  const g = (grade ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(prek|wonderlab|wl)/.test(g)) return 0;
  if (/^(k|kinder|kindergarten|learninglab|ll)$/.test(g)) return 1;
  const n = parseInt(g, 10);
  return Number.isFinite(n) ? n + 1 : 99;
}

// Turns a Google Sheets CSV export into one row per guardian. Understands
// single guardian columns (Parent, Phone, Email…) and numbered ones
// (Parent 1 Name, Parent 1 Phone, Parent 2 Email…).
export function parseParentCsv(text: string): { rows: ParentRow[]; error?: string } {
  const table = parseCsv(text.replace(/^﻿/, ""));
  if (table.length < 2) return { rows: [], error: "The file has no data rows." };
  const headers = table[0].map(norm);

  const iStudent = pick(headers, ["student", "student name", "name", "child", "child name", "student full name", "full name"]);
  const iFirst = pick(headers, ["first", "first name", "student first name", "preferred name"]);
  const iLast = pick(headers, ["last", "last name", "student last name", "surname"]);
  const iGrade = pick(headers, ["grade", "level", "class", "grade level"]);
  const iCampus = pick(headers, ["campus", "location", "site"]);
  const iNotes = pick(headers, ["notes", "note", "comments"]);
  if (iStudent < 0 && iFirst < 0) return { rows: [], error: "Couldn't find a student name column (e.g. \"Student\" or \"First name\")." };

  // Guardian slots: numbered ("parent 1 phone") or a single unnumbered set.
  type Slot = { name: number; rel: number; phone: number; email: number };
  const slots = new Map<string, Slot>();
  headers.forEach((h, i) => {
    const m = h.match(/^(?:parent|guardian|contact|emergency contact)\s*(\d)?\s*(.*)$/);
    const field = m ? m[2] : h;
    const key = m?.[1] ?? "0";
    const slot = slots.get(key) ?? { name: -1, rel: -1, phone: -1, email: -1 };
    const f = field.trim();
    if (m && /^((guardian|parent)\s*)?(full\s*)?(name)?$/.test(f)) slot.name = i;
    else if (/^(relationship|relation)$/.test(f)) slot.rel = i;
    else if (/(phone|cell|mobile|tel)/.test(f)) slot.phone = i;
    else if (/e ?mail/.test(f)) slot.email = i;
    else return;
    slots.set(key, slot);
  });
  const usable = [...slots.values()].filter((s) => s.name >= 0 || s.phone >= 0 || s.email >= 0);
  if (!usable.length) return { rows: [], error: "Couldn't find any parent name, phone or email columns." };

  const cell = (r: string[], i: number) => (i >= 0 && r[i]?.trim() ? r[i].trim() : null);
  const rows: ParentRow[] = [];
  for (const r of table.slice(1)) {
    const student = cell(r, iStudent) ?? [cell(r, iFirst), cell(r, iLast)].filter(Boolean).join(" ");
    if (!student) continue;
    const grade = cell(r, iGrade);
    const campus = campusFor(grade, cell(r, iCampus));
    for (const s of usable) {
      const guardian = cell(r, s.name), phone = cell(r, s.phone), email = cell(r, s.email);
      if (!guardian && !phone && !email) continue;
      rows.push({ campus, student, grade, guardian, relationship: cell(r, s.rel), phone, email, notes: cell(r, iNotes), sort: gradeRank(grade) });
    }
  }
  if (!rows.length) return { rows, error: "No rows with a student and a parent contact were found." };
  return { rows };
}
