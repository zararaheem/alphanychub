import { requireMember } from "@/lib/access";
import { CAMPUS_LABEL } from "@/lib/campus";
import { currentCampus } from "@/lib/campus-pref";
import { getStudents } from "@/lib/data";
import { PROGRAM_LEVELS } from "@/lib/levels";
import { StudentList } from "@/components/student-list";
import { MEDICATIONS_URL } from "@/lib/links";

export default async function StudentsPage() {
  await requireMember();
  const campus = await currentCampus();
  const [all, students] = await Promise.all([getStudents(null), getStudents(campus)]);
  const by = (c: string) => all.filter((s) => s.campus === c).length;
  const levels = PROGRAM_LEVELS.filter((l) => !campus || l.campus === campus);

  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Students</h1>
        <p className="lede">Enrolled students{campus ? ` · ${CAMPUS_LABEL[campus]}` : " at both campuses"}, by level.</p>
        <a href={MEDICATIONS_URL} target="_blank" rel="noopener noreferrer" className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Student medications ↗</a>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="label-caps">Enrolled</span>
          <b>{students.length}</b>
          <span className="note">{campus ? CAMPUS_LABEL[campus] : "Both campuses"}</span>
        </div>
        <div className="kpi">
          <span className="label-caps">Maiden Ln</span>
          <b>{by("maiden-ln")}</b>
          <span className="note">Learning Lab through High School</span>
        </div>
        <div className="kpi">
          <span className="label-caps">Early Years</span>
          <b>{by("early-years")}</b>
          <span className="note">Wonder Lab (PreK)</span>
        </div>
      </div>

      <div className="level-chips" aria-label="Students by level">
        {levels.map((l) => (
          <span key={l.name} className="chip" style={{ cursor: "default" }}>
            {l.name} <b style={{ marginLeft: 6 }}>{all.filter((s) => s.level === l.name).length}</b>
          </span>
        ))}
      </div>

      {students.length === 0 ? (
        <section className="card"><p className="empty">No students loaded yet.</p></section>
      ) : (
        <StudentList rows={students} />
      )}
    </main>
  );
}
