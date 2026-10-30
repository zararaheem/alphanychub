import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/access";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "EY Attendance · Alpha NYC" };

// Early Years arrivals and dismissal stands on its own link, like the tracker.
export default async function EyLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <>
      <header className="hub-header">
        <div className="wrap">
          <Link href="/ey" className="brand" aria-label="EY Attendance home"><Brand /></Link>
          <span className="ph-title">EY Attendance</span>
        </div>
      </header>
      {children}
    </>
  );
}
