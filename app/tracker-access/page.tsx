import Link from "next/link";
import { requireMember } from "@/lib/access";
import { GoogleButton } from "@/app/login/google-button";

// Why someone can't open the Montessori tracker, and what to do about it.
export default async function TrackerAccess({ searchParams }: { searchParams: Promise<{ why?: string }> }) {
  const me = await requireMember();
  const { why } = await searchParams;
  const google = why === "google" || !me.google;
  return (
    <main className="wrap stack ph-narrow" style={{ paddingTop: 32 }}>
      <h1>Early Years Montessori tracker</h1>
      {google ? (
        <div className="card stack">
          <p>The tracker holds children&apos;s work and photos, so it needs your own Google sign-in, not the shared staff code.</p>
          <GoogleButton next="/tracker" />
        </div>
      ) : (
        <div className="card stack">
          <p><b>{me.email}</b> isn&apos;t approved for the tracker yet.</p>
          <p className="small muted">Ask Zara Raheem (Chief of Staff) to turn on “Montessori tracker” for you on the hub&apos;s Access page.</p>
        </div>
      )}
      <Link href="/" className="small">← NYC Hub</Link>
    </main>
  );
}
