import Link from "next/link";
import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { getStudents } from "@/lib/data";
import { PROGRAM_LEVELS } from "@/lib/levels";
import { PrintButton } from "@/components/print-button";

// One printed page per level: a numbered class list with blank columns to fill in by hand.
export default async function StudentListsPrint() {
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
  const printed = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  return (
    <main className="page class-lists">
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <div className="stack-sm">
          <Link href="/students" className="small">← Students</Link>
          <h1>Class lists</h1>
          <p className="lede">One page per level{campus ? ` · ${CAMPUS_LABEL[campus]}` : ""}. Print, or save as PDF.</p>
        </div>
        <PrintButton />
      </div>

      {levels.map((l) => (
        <section key={l.key} className="class-list">
          <header className="class-list-head">
            <div>
              <span className="kicker">Alpha NYC · {l.campus === "early-years" ? "Early Years" : "Maiden Ln"}</span>
              <h2>{l.title} <span className="muted">· {l.grades}</span></h2>
            </div>
            <span className="small muted">{l.rows.length} students · {printed}</span>
          </header>
          <table className="class-table">
            <thead>
              <tr><th className="n">#</th><th>Student</th><th className="g">Grade</th><th className="box">Here</th><th className="notes">Notes</th></tr>
            </thead>
            <tbody>
              {l.rows.map((s, i) => (
                <tr key={s.id}>
                  <td className="n">{i + 1}</td>
                  <td><b>{s.last_name}</b>, {s.first_name}</td>
                  <td className="g">{s.grade ?? ""}</td>
                  <td className="box"><span className="tick-box" /></td>
                  <td className="notes" />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
