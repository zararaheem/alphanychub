import Link from "next/link";
import { requireMember, ROLE_LABELS } from "@/lib/access";
import { SignOut } from "@/components/sign-out";
import { HubNav } from "@/components/hub-nav";
import { Brand } from "@/components/brand";
import { OFF_CAMPUS_URL, ATTENDANCE_URL } from "@/lib/links";
import { currentCampus } from "@/lib/campus-pref";

// Every page in this group requires a signed-in user who is on the access list.
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const campus = await currentCampus();
  const tabs = [
    { href: "/", label: "Home" },
    { href: "/emergency", label: "Emergency" },
    { href: "/workshops", label: "Workshops" },
    { href: "/maiden-ln", label: "Maiden Ln" },
    { href: "/early-years", label: "Early Years" },
    ...(me.role === "admin" ? [{ href: "/access", label: "Access" }] : []),
  ];
  const external = [
    ...(OFF_CAMPUS_URL ? [{ href: OFF_CAMPUS_URL, label: "Off-campus board" }] : []),
    ...(ATTENDANCE_URL ? [{ href: ATTENDANCE_URL, label: "Attendance" }] : []),
  ];

  return (
    <>
      <header className="hub-header">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Alpha NYC Hub home">
            <Brand />
          </Link>
          <div className="who">
            <span>
              {me.name ?? me.email} · {ROLE_LABELS[me.role]}
            </span>
            <SignOut />
          </div>
        </div>
      </header>
      <HubNav tabs={tabs} external={external} campus={campus} />
      {children}
    </>
  );
}
