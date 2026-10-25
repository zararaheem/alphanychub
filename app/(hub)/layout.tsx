import Link from "next/link";
import { requireMember, ROLE_LABELS } from "@/lib/access";
import { HUB_NAME } from "@/lib/campus";
import { SignOut } from "@/components/sign-out";
import { HubNav } from "@/components/hub-nav";

// Every page in this group requires a signed-in user who is on the access list.
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const tabs = [
    { href: "/", label: "Home" },
    { href: "/emergency", label: "Emergency" },
    { href: "/off-campus", label: "Off campus" },
    { href: "/workshops", label: "Workshops" },
    { href: "/maiden-ln", label: "Maiden Ln" },
    { href: "/early-years", label: "Early Years" },
    ...(me.role === "admin" ? [{ href: "/access", label: "Access" }] : []),
  ];

  return (
    <>
      <header className="hub-header">
        <div className="wrap">
          <Link href="/" className="brand">
            <span className="brand-mark">NYC</span>
            <span className="brand-name">{HUB_NAME}</span>
          </Link>
          <div className="who">
            <span>
              {me.name ?? me.email} · {ROLE_LABELS[me.role]}
            </span>
            <SignOut />
          </div>
        </div>
      </header>
      <HubNav tabs={tabs} />
      {children}
    </>
  );
}
