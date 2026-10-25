"use client";

import { useEffect, useState } from "react";

const fmt = (d: Date) => ({
  time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }),
  date: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }),
});

// Live New York clock, as on the Off-Campus Today board.
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  const f = now ? fmt(now) : null;
  return (
    <div className="clock" aria-live="off">
      <b suppressHydrationWarning>{f?.time ?? "--:--"}</b>
      <span suppressHydrationWarning>{f?.date ?? ""}</span>
    </div>
  );
}
