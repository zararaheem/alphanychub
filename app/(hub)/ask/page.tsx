import Link from "next/link";
import { requireMember } from "@/lib/access";
import { AskChat } from "@/components/ask-chat";

export default async function AskPage() {
  await requireMember();
  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <div className="between">
        <div className="stack-sm">
          <h1>Ask the hub</h1>
          <p className="lede">Describe a question or a situation. You&apos;ll get what it means, what to do, who to check with, and where the policy says so.</p>
        </div>
        <Link href="/resources" className="edit-toggle">Resource library</Link>
      </div>
      <p className="notice">In an emergency happening now: <b>call 911</b> and alert everyone by radio (alt: Zello) first.</p>
      <AskChat />
      <p className="small muted">Answers come from the Policies and Procedures handbook, campus know-how and the hub. Always confirm with the person it names before acting on anything involving a family, safety, discipline or money.</p>
    </main>
  );
}
