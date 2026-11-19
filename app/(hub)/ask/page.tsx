import Link from "next/link";
import { EDITORS, requireMember } from "@/lib/access";
import { AskChat } from "@/components/ask-chat";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const me = await requireMember();
  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <div className="between">
        <div className="stack-sm">
          <h1>Ask the hub</h1>
          <p className="lede">Describe a question or a situation. You&apos;ll get what it means, what to do, who to check with, and where the policy says so.</p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {EDITORS.includes(me.role) && <Link href="/ask/insights" className="edit-toggle">Insights</Link>}
          {me.role === "admin" && <Link href="/ask/knowledge" className="edit-toggle">What it knows</Link>}
          <Link href="/resources" className="edit-toggle">Resource library</Link>
        </div>
      </div>
      <p className="notice">In an emergency happening now: <b>call 911</b> and alert everyone by radio (alt: Zello) first.</p>
      <AskChat initial={q?.slice(0, 500)} />
      <p className="small muted">Answers come from the Policies and Procedures handbook, campus know-how and the hub. Always confirm with the person it names before acting on anything involving a family, safety, discipline or money.</p>
    </main>
  );
}
