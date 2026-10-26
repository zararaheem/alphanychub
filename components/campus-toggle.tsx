"use client";

import { usePathname } from "next/navigation";
import { CAMPUSES, type Campus } from "@/lib/campus";

// Top-of-page switch between both campuses, Maiden Ln and Early Years.
export function CampusToggle({ current }: { current: Campus | null }) {
  const path = usePathname();
  const items = [{ id: null as Campus | null, name: "Both" }, ...CAMPUSES.map((c) => ({ id: c.id as Campus | null, name: c.name }))];
  return (
    <div className="campus-toggle" role="group" aria-label="Campus">
      {items.map((c) => (
        <a
          key={c.id ?? "all"}
          href={`/campus?set=${c.id ?? "all"}&next=${encodeURIComponent(path)}`}
          aria-current={current === c.id ? "true" : undefined}
        >
          {c.name}
        </a>
      ))}
    </div>
  );
}
