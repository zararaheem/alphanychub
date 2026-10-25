"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EarlyYearsNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Early Years" className="subnav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="chip" aria-current={path === i.href ? "page" : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}
