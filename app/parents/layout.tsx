import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Alpha NYC · Parent Hub", description: "Requests, times and contacts for Alpha NYC families." };

// The Parent Hub sits outside the staff hub: no staff tabs, phone-first.
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="hub-header">
        <div className="wrap">
          <Link href="/parents" className="brand" aria-label="Parent Hub home"><Brand /></Link>
          <span className="ph-title">Parent Hub</span>
        </div>
      </header>
      <main className="page ph-page">{children}</main>
    </>
  );
}
