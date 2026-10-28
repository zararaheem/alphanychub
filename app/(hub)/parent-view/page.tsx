import { requireMember } from "@/lib/access";
import { getParentDemo } from "@/lib/parent-demo";
import { ParentDemo } from "@/components/parent-demo";

export default async function ParentViewPage() {
  await requireMember();
  const data = await getParentDemo();
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Parent Hub preview</h1>
        <p className="lede">A click-through of what families see in the Parent Hub. Nothing here sends anything.</p>
      </div>
      <div className="pv-wrap">
        <ParentDemo data={data} />
        <aside className="stack-sm pv-notes">
          <p className="small muted">Families sign in at <b>/parents</b> with the email the school has for them. Their requests land in Requests and post to Slack.</p>
          <a href="/parents" className="btn sm" style={{ alignSelf: "flex-start" }}>Open the Parent Hub (staff preview)</a>
          <a href="/requests" className="btn ghost sm" style={{ alignSelf: "flex-start" }}>See requests →</a>
        </aside>
      </div>
    </main>
  );
}
