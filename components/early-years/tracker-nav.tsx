"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The tracker's own sections, shown on every tracker page.
const LINKS: [string, string][] = [
  ["/tracker", "Students & lessons"],
  ["/tracker/attendance", "Attendance & dismissal"],
  ["/tracker/report", "Weekly report"],
  ["/tracker/parent", "Parent reports"],
];

export function TrackerNav() {
  const path = usePathname();
  return (
    <nav className="tr-nav no-print" aria-label="Early Years Tracker">
      <div className="wrap">
        {LINKS.map(([href, label]) => {
          const on = href === "/tracker" ? path === "/tracker" : path.startsWith(href);
          return <Link key={href} href={href} aria-current={on ? "page" : undefined}>{label}</Link>;
        })}
      </div>
    </nav>
  );
}
