import { canSeeLead, requireMember } from "@/lib/access";
import { EarlyYearsNav } from "@/components/early-years/nav";
import { PARENT_VIEW_URL } from "@/lib/links";

export default async function EarlyYearsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const items = [
    { href: "/early-years", label: "Campus" },
    { href: "/early-years/guide", label: "Guide tools" },
    ...(canSeeLead(me.role) ? [{ href: "/early-years/lead", label: "Lead Guide" }] : []),
  ];
  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <EarlyYearsNav items={items} external={[{ href: PARENT_VIEW_URL, label: "Parent view" }]} />
      </div>
      {children}
    </>
  );
}
