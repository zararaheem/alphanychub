import { CampusOverview } from "@/components/campus-overview";

export default function MaidenLnPage() {
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>Maiden Ln</h1>
        <p className="lede">Campus essentials: who to call, who&apos;s off campus, and what&apos;s coming up.</p>
      </div>
      <CampusOverview campus="maiden-ln" />
    </main>
  );
}
