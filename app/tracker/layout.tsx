import Link from "next/link";
import type { Metadata } from "next";
import { canSeeLead, requireMember } from "@/lib/access";
import { Brand } from "@/components/brand";
import { EarlyYearsNav } from "@/components/early-years/nav";

export const metadata: Metadata = { title: "Early Years Tracker · Alpha NYC" };

// The Early Years tracker stands on its own (its own link, no staff hub tabs),
// but still needs a staff sign-in.
export default async function TrackerLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const items = [
    { href: "/tracker", label: "Guide tools" },
    ...(canSeeLead(me.role) ? [{ href: "/tracker/lead", label: "Lead Guide" }] : []),
  ];
  return (
    <>
      <header className="hub-header">
        <div className="wrap">
          <Link href="/tracker" className="brand" aria-label="Early Years Tracker home"><Brand /></Link>
          <span className="ph-title">Early Years Tracker</span>
        </div>
      </header>
      <div className="wrap row" style={{ paddingTop: 16, justifyContent: "space-between" }}>
        <EarlyYearsNav items={items} />
        <Link href="/" className="small">NYC Hub →</Link>
      </div>
      {children}
    </>
  );
}
