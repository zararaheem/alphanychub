import Link from "next/link";
import { requireMember } from "@/lib/access";
import { getStaff } from "@/lib/data";
import { PrintButton } from "@/components/print-button";
import type { StaffCampus, StaffMember } from "@/lib/types";

// Printable staff contact sheet: everyone's role, phone and email by campus.
// Staff only (signed in); prints or saves as PDF from the browser.
const GROUPS: { id: StaffCampus; label: string }[] = [
  { id: "all", label: "Both campuses" },
  { id: "maiden-ln", label: "Maiden Ln" },
  { id: "early-years", label: "Early Years · William St" },
  { id: "unassigned", label: "Not assigned yet" },
];

const printed = () => new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

export const metadata = { title: "Staff contact sheet · Alpha NYC" };

export default async function StaffContacts() {
  await requireMember();
  const staff = await getStaff(null);
  const byName = (a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name);

  return (
    <main className="page sheet contact-sheet">
      <div className="between no-print" style={{ alignItems: "center" }}>
        <Link href="/staff" className="back-link">← Staff</Link>
        <PrintButton />
      </div>
      <header className="sheet-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="kicker">Alpha NYC · Staff only</span>
          <h1>Staff contact sheet</h1>
        </div>
        <p className="sheet-intro">Everyone&apos;s role, phone and email. Keep it private: don&apos;t share outside Alpha. In an emergency, call 911 first.</p>
      </header>
      {GROUPS.map((g) => {
        const rows = staff.filter((s) => s.campus === g.id).sort(byName);
        if (!rows.length) return null;
        return (
          <section key={g.id} className="sheet-sec">
            <h2>{g.label} ({rows.length})</h2>
            <table className="sheet-table">
              <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{[s.title, s.team].filter(Boolean).join(" · ")}</td>
                    <td className="nowrap">{s.phone ? <a href={tel(s.phone)}>{s.phone}</a> : <span className="sheet-note">–</span>}</td>
                    <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : <span className="sheet-note">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      <footer className="sheet-foot">
        <span>Missing or wrong? Tell your Campus Coordinator, or update it on the Staff page.</span>
        <span>Printed {printed()}</span>
      </footer>
    </main>
  );
}
