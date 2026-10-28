// What families see: the day's times, info sections and who to contact.
// Shared by the Parent Hub (/parents) and the staff-side click-through demo.
export type DemoSection = { slug: string; title: string; summary: string | null; body: string | null };
export type DemoInfo = { section: string; title: string; meta: string | null; body: string | null };
export type DemoRow = { section_slug: string; label: string; value: string | null };
export type DemoCard = { when_to_use: string | null; who: string; role: string | null; phone: string | null; email: string | null; note: string | null };
export type ParentContent = { sections: DemoSection[]; info: DemoInfo[]; rows: DemoRow[]; cards: DemoCard[] };

export const PARENT_CONTENT: ParentContent = {
  sections: [
    { slug: "busing", title: "Busing", summary: "Routes, stops, and what to do when the bus is late.", body: null },
    { slug: "afterschool", title: "Afterschool", summary: "Programs, pickup times, and how to sign up.", body: null },
    { slug: "arrival", title: "Arrival & the school day", summary: "Doors, start times, and what late arrival looks like.", body: null },
    { slug: "calendar", title: "Calendar & closures", summary: "Holidays, half days, and weather closures.", body: null },
  ],
  info: [
    { section: "daily", title: "Arrival", meta: "8:15 – 8:45 AM", body: null },
    { section: "daily", title: "Dismissal", meta: "3:30 PM", body: null },
    { section: "daily", title: "Early pickup", meta: "Before 2:45 PM", body: null },
    { section: "busing", title: "Bus routes & stops", meta: null, body: null },
    { section: "busing", title: "Riding a different bus", meta: "By 11:00 AM", body: null },
    { section: "busing", title: "If the bus is late", meta: null, body: null },
    { section: "afterschool", title: "Afterschool program", meta: "3:45 – 4:45 PM, Mon–Thu", body: null },
  ],
  rows: [
    { section_slug: "busing", label: "Same-day bus change", value: "Send a pickup change before 11:00 AM" },
  ],
  cards: [
    { when_to_use: "Dismissal, late arrival, lunch & logistics", who: "Campus Coordinator", role: "Julianne Braime (Maiden Ln) · Emerly Campusano (Early Years)", phone: null, email: null, note: null },
    { when_to_use: "Academics & progress", who: "Your child's Guide, or the DoP", role: "During school hours · Terrence McMullen, Dean of Parents", phone: null, email: null, note: null },
    { when_to_use: "Something urgent right now", who: "Head of School", role: "Tasha Arnold", phone: null, email: null, note: null },
  ],
};
