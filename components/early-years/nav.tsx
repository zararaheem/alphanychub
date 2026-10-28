"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExtIcon } from "@/components/external-link";

export function EarlyYearsNav({ items, external = [] }: { items: { href: string; label: string }[]; external?: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Early Years" className="subnav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="chip" aria-current={path === i.href ? "page" : undefined}>{i.label}</Link>
      ))}
      {external.map((e) => (
        <a key={e.href} href={e.href} target="_blank" rel="noopener noreferrer" className="chip">
          {e.label} <ExtIcon /><span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </nav>
  );
}
