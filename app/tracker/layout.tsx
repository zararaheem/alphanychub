import Link from "next/link";
import type { Metadata } from "next";
import { requireTracker } from "@/lib/access";
import { Brand } from "@/components/brand";
import { SignOut } from "@/components/sign-out";

export const metadata: Metadata = { title: "Early Years Tracker · Alpha NYC" };

// The Montessori tracker stands on its own link. Only approved people,
// signed in with Google, can open it (and the database checks the same).
export default async function TrackerLayout({ children }: { children: React.ReactNode }) {
  const me = await requireTracker();
  return (
    <>
      <header className="hub-header no-print">
        <div className="wrap">
          <Link href="/tracker" className="brand" aria-label="Early Years Tracker home"><Brand /></Link>
          <span className="ph-title">Wonder Lab Tracker</span>
          <span className="tr-me small">{me.name ?? me.email}</span>
          <SignOut className="btn ghost sm tr-out" />
        </div>
      </header>
      {children}
    </>
  );
}
