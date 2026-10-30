import Link from "next/link";
import { requireMember } from "@/lib/access";
import { getParentDemo } from "@/lib/parent-demo";
import { REQUEST_KINDS } from "@/lib/requests";
import { ParentDemo } from "@/components/parent-demo";

// Who gets each Parent Hub form. Mirrors the routing in lib/requests.ts.
const GOES_TO: Record<string, string> = {
  pickup: "Campus Coordinator: Julianne (Maiden Ln) or Emerly (Early Years)",
  absence: "Campus Coordinator: Julianne (Maiden Ln) or Emerly (Early Years)",
  medication: "Campus Coordinator: Julianne (Maiden Ln) or Emerly (Early Years). Slack gets the headline only; details stay in the hub.",
  question: "Terrence (DoP). Urgent, or addressed to the Head of School: Tasha and Terrence.",
};

export default async function ParentViewPage() {
  await requireMember();
  const data = await getParentDemo();
  const forms = REQUEST_KINDS.filter((k) => k.audience === "parent");
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Parent Hub</h1>
        <p className="lede">
          What families see at <b>nychub.vercel.app/parents</b>, and where what they send ends up. The phone below is a demo: nothing sends.
        </p>
      </div>
      <div className="pv-wrap">
        <ParentDemo data={data} />
        <aside className="stack pv-notes">
          <section className="card">
            <h2 className="card-title">Where family requests go</h2>
            <ol className="steps big">
              <li>A family signs in with Google (the email on the parent roster) and sends a form.</li>
              <li>It posts to the shared Slack channel and @-mentions the right person.</li>
              <li>It lands in <Link href="/requests?from=parent"><b>Requests</b></Link>, where Coordinators, Admins and Lead Guides mark it In progress or Done and add a note the family sees.</li>
            </ol>
          </section>
          <section className="card">
            <h2 className="card-title">Who gets each form</h2>
            <dl className="req-details">
              {forms.map((k) => (
                <div key={k.id}><dt>{k.title}</dt><dd>{GOES_TO[k.id]}</dd></div>
              ))}
            </dl>
          </section>
          <div className="row">
            <Link href="/parents" className="btn">Try it for real (staff preview)</Link>
            <Link href="/requests?from=parent" className="btn outline">See parent requests</Link>
          </div>
          <p className="small muted">Staff preview sends real requests marked TEST, so you can watch one arrive in Requests and Slack.</p>
        </aside>
      </div>
    </main>
  );
}
