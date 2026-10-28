import { requireMember } from "@/lib/access";
import { getParentDemo } from "@/lib/parent-demo";
import { PARENT_VIEW_URL } from "@/lib/links";
import { ParentDemo } from "@/components/parent-demo";

export default async function ParentViewPage() {
  await requireMember();
  const data = await getParentDemo();
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Parent view</h1>
        <p className="lede">A click-through demo of the Alpha NYC Families app, so you know what parents see. Nothing here sends anything.</p>
      </div>
      <div className="pv-wrap">
        <ParentDemo data={data} />
        <aside className="stack-sm pv-notes">
          <p className="small muted">
            {data.live ? "Showing the Families app's current content." : "Showing a snapshot of the Families app's content."} Text marked
            &ldquo;placeholder&rdquo; hasn&apos;t been written yet.
          </p>
          <a href={PARENT_VIEW_URL} target="_blank" rel="noopener noreferrer" className="btn ghost sm" style={{ alignSelf: "flex-start" }}>Open the real Families app ↗</a>
          <p className="small muted">Families sign in there with the email on the family roster.</p>
        </aside>
      </div>
    </main>
  );
}
