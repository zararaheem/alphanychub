import { createClient } from "@/lib/supabase/server";

// What the Families app shows, for the staff-side click-through preview.
// Reads the live Families content when staff are allowed to; otherwise falls
// back to a snapshot so the demo always works.
export type DemoSection = { slug: string; title: string; summary: string | null; body: string | null };
export type DemoInfo = { section: string; title: string; meta: string | null; body: string | null };
export type DemoRow = { section_slug: string; label: string; value: string | null };
export type DemoCard = { when_to_use: string | null; who: string; role: string | null; phone: string | null; email: string | null; note: string | null };
export type ParentDemoData = { live: boolean; sections: DemoSection[]; info: DemoInfo[]; rows: DemoRow[]; cards: DemoCard[] };

const SNAPSHOT: Omit<ParentDemoData, "live"> = {
  sections: [
    { slug: "busing", title: "Busing", summary: "Routes, stops, and what to do when the bus is late.", body: null },
    { slug: "afterschool", title: "Afterschool", summary: "Programs, pickup times, and how to sign up.", body: null },
    { slug: "arrival", title: "Arrival & the school day", summary: "Doors, start times, and what late arrival looks like.", body: null },
    { slug: "calendar", title: "Calendar & closures", summary: "Holidays, half days, and weather closures.", body: null },
  ],
  info: [
    { section: "daily", title: "Arrival", meta: "8:15 – 8:45 AM", body: null },
    { section: "daily", title: "Dismissal", meta: "3:15 PM", body: null },
    { section: "daily", title: "Early pickup", meta: "Before 2:45 PM", body: null },
    { section: "busing", title: "Bus routes & stops", meta: null, body: null },
    { section: "busing", title: "Riding a different bus", meta: "By 11:00 AM", body: null },
    { section: "busing", title: "If the bus is late", meta: null, body: null },
    { section: "afterschool", title: "Afterschool program", meta: "3:15 – 6:00 PM, Mon–Fri", body: null },
    { section: "afterschool", title: "Late pickup", meta: "After 6:00 PM", body: null },
  ],
  rows: [
    { section_slug: "busing", label: "Same-day bus change", value: "Submit on this hub before 11:00 AM" },
  ],
  cards: [
    { when_to_use: "Dismissal & attendance", who: "Front desk", role: "Operations", phone: null, email: null, note: null },
    { when_to_use: "Academics & progress", who: "Your child's Guide", role: "Guide", phone: null, email: null, note: null },
    { when_to_use: "Health & medication", who: "Health lead", role: "Health", phone: null, email: null, note: null },
    { when_to_use: "Something urgent right now", who: "Campus lead", role: "Leadership", phone: null, email: null, note: null },
  ],
};

export async function getParentDemo(): Promise<ParentDemoData> {
  const supabase = await createClient();
  const [s, i, r, c] = await Promise.all([
    supabase.from("hub_sections").select("slug, title, summary, body").eq("active", true).order("sort_order"),
    supabase.from("hub_info").select("section, title, meta, body").eq("active", true).order("sort_order"),
    supabase.from("hub_section_rows").select("section_slug, label, value").order("sort_order"),
    supabase.from("contact_cards").select("when_to_use, who, role, phone, email, note").eq("active", true).order("sort_order"),
  ]);
  if (s.error || !s.data?.length) return { live: false, ...SNAPSHOT };
  return {
    live: true,
    sections: s.data as DemoSection[], info: (i.data ?? []) as DemoInfo[],
    rows: (r.data ?? []) as DemoRow[], cards: (c.data ?? []) as DemoCard[],
  };
}
