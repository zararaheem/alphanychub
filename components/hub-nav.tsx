"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HubNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="hub-nav" aria-label="Hub sections">
      <div className="wrap">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="tab" aria-current={active(t.href) ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
