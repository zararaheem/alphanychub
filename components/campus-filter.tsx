import Link from "next/link";
import { CAMPUSES, type Campus } from "@/lib/campus";

// Chip row that sets ?campus= on the current page.
export function CampusFilter({ base, current }: { base: string; current: Campus | null }) {
  const items = [{ id: null as Campus | null, name: "Both campuses" }, ...CAMPUSES];
  return (
    <div className="row" role="group" aria-label="Campus">
      {items.map((c) => (
        <Link
          key={c.id ?? "all"}
          href={c.id ? `${base}?campus=${c.id}` : base}
          className="chip"
          aria-current={current === c.id ? "page" : undefined}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
