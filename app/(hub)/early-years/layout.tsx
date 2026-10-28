import { canSeeLead, requireMember } from "@/lib/access";
import { EarlyYearsNav } from "@/components/early-years/nav";

export default async function EarlyYearsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const items = [
    { href: "/early-years", label: "Campus" },
    { href: "/early-years/guide", label: "Guide tools" },
    { href: "/parent-view", label: "Parent Hub preview" },
    ...(canSeeLead(me.role) ? [{ href: "/early-years/lead", label: "Lead Guide" }] : []),
  ];
  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <EarlyYearsNav items={items} />
      </div>
      {children}
    </>
  );
}
