import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { getStudents } from "@/lib/data";
import { PROGRAM_LEVELS } from "@/lib/levels";
import { PrintButton } from "@/components/print-button";
import { RollCall } from "@/components/roll-call";

// One printed page per level: a numbered class list to fill in by hand, or tap to take roll on a phone.
export default async function StudentListsPrint({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  await requireMember();
  const campus = await currentCampus();
  const students = await getStudents(campus);
  // A level split into groups (Level 1 A and B) prints one page per group.
  const byName = (a: (typeof students)[number], b: (typeof students)[number]) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
  const levels = PROGRAM_LEVELS.filter((l) => !campus || l.campus === campus).flatMap((l) => {
    const rows = students.filter((s) => s.level === l.name).sort(byName);
    const groups = [...new Set(rows.map((s) => s.group_name).filter((g): g is string => !!g))].sort();
    if (!groups.length) return rows.length ? [{ ...l, key: l.name, title: l.name, rows }] : [];
    return groups.map((g) => ({ ...l, key: `${l.name}-${g}`, title: `${l.name} ${g}`, rows: rows.filter((s) => s.group_name === g) }));
  });
  const { list } = await searchParams;
  const shown = list ? levels.filter((l) => l.key === list) : levels;
  const printed = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  return (
    <main className="page class-lists">
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <div className="stack-sm">
          <Link href="/students" className="small">← Students</Link>
          <h1>Class lists</h1>
          <p className="lede">Tap a student to mark them here (tap again for absent today). Pick one list to print on its own, or print all{campus ? ` · ${CAMPUS_LABEL[campus]}` : ""}.</p>
        </div>
        <PrintButton />
      </div>

      <nav className="row no-print" aria-label="Choose a list" style={{ gap: 6 }}>
        <Link href="/students/print" className="chip" aria-current={!list ? "page" : undefined}>All lists</Link>
        {levels.map((l) => (
          <Link key={l.key} href={`/students/print?list=${encodeURIComponent(l.key)}`} className="chip" aria-current={list === l.key ? "page" : undefined}>{l.title}</Link>
        ))}
      </nav>

      {shown.map((l) => (
        <section key={l.key} className="class-list">
          <header className="class-list-head">
            <div>
              <span className="kicker">Alpha NYC · {l.campus === "early-years" ? "Early Years" : "Maiden Ln"}</span>
              <h2>{l.title}</h2>
            </div>
            <span className="small muted">{l.rows.length} students · {printed}</span>
          </header>
          <RollCall listKey={l.key} title={l.title} rows={l.rows.map((s) => ({ id: s.id, first: s.first_name, last: s.last_name }))} />
        </section>
      ))}
    </main>
  );
}
