import Link from "next/link";
import { getParentDemo } from "@/lib/parent-demo";
import { ParentDemo } from "@/components/parent-demo";

// Public click-through of the Parent Hub. Shared content only, no family data; nothing sends.
export default async function ParentHubDemo() {
  const data = await getParentDemo();
  return (
    <>
      <div className="stack-sm">
        <h1>Parent Hub demo</h1>
        <p className="lede">Tap around to see what families see. Nothing here sends anything.</p>
      </div>
      <div className="pv-wrap">
        <ParentDemo data={data} />
      </div>
      <div className="row">
        <Link href="/parents" className="btn">Families: sign in</Link>
        <Link href="/login" className="btn ghost">Staff sign in</Link>
      </div>
    </>
  );
}
