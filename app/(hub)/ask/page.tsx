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
          <p className="lede">Type a few words and get the matching procedures, one-pager sections, checklist items, people and tools.</p>
        </div>
        <Link href="/resources" className="edit-toggle">Resource library</Link>
      </div>
      <p className="notice">In an emergency happening now: <b>call 911</b> and alert everyone by radio (alt: Zello) first.</p>
      <AskChat />
      <p className="small muted">Results come only from whatAnswers come only from what&apos;s in the hub. If something is missing or wrong, tell an admin so it can be added to Resources.apos;s in the hub. If something is missing, an admin can add it under Resources and it becomes searchable right away.</p>
    </main>
  );
}
