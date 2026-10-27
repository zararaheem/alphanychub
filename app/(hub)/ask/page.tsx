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
          <p className="lede">Type a question and get an answer from the hub&apos;s procedures, one-pagers, workshops and resources.</p>
        </div>
        <Link href="/resources" className="edit-toggle">Resources</Link>
      </div>
      <p className="notice">In an emergency happening now: <b>call 911</b> and alert everyone by radio (alt: Zello) first.</p>
      <AskChat />
      <p className="small muted">Answers come only from what&apos;s in the hub. If something is missing or wrong, tell an admin so it can be added to Resources.</p>
    </main>
  );
}
