import Link from "next/link";
import { GUIDE_LIST } from "@/lib/guides";

export default function GuidesPage() {
  return (
    <main className="page">
      <div className="stack-sm">
        <h1>One-pagers</h1>
        <p className="lede">Quick, printable summaries. Open one on your phone or print it for the wall.</p>
      </div>
      <div className="grid">
        {GUIDE_LIST.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-link">
            <span className="card-title">{g.title}</span>
            <span className="muted">{g.blurb}</span>
            <span className="small" style={{ color: "var(--teal)", fontWeight: 700 }}>Open →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
