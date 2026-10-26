"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExtIcon } from "@/components/external-link";
import { CampusToggle } from "@/components/campus-toggle";
import type { Campus } from "@/lib/campus";

type Item = { href: string; label: string };

export function HubNav({ tabs, external = [], campus }: { tabs: Item[]; external?: Item[]; campus: Campus | null }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="hub-nav" aria-label="Hub sections">
      <div className="wrap">
        <div className="tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="tab" aria-current={active(t.href) ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
        {external.map((t) => (
          <a key={t.href} href={t.href} className="tab" target="_blank" rel="noopener noreferrer" style={{ gap: 6 }}>
            {t.label} <ExtIcon />
          </a>
        ))}
        </div>
        <CampusToggle current={campus} />
      </div>
    </nav>
  );
}
