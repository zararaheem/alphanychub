// Run before every workshop, mobile squad or Fun Friday (staff morning meetings, Oct 26–30).
export type CheckItem = { n: number; check: string; who: string };

export const CORE_SIX: CheckItem[] = [
  { n: 1, check: "Waiver needed?", who: "Zara" },
  { n: 2, check: "Vendor contract?", who: "Zara + Legal" },
  { n: 3, check: "On the off-campus app?", who: "Emily" },
  { n: 4, check: "Off-campus attendance?", who: "Julianne" },
  { n: 5, check: "Guard needed?", who: "Zara" },
  { n: 6, check: "Transportation needed / booked?", who: "Julianne" },
];

export const ALSO_CHECK: CheckItem[] = [
  { n: 7, check: "Photos or video? Media release", who: "Julianne" },
  { n: 8, check: "Change of lunch plans?", who: "Julianne" },
  { n: 9, check: "Guests coming in?", who: "Julianne / Zara" },
  { n: 10, check: "Room or setup change?", who: "Ops" },
  { n: 11, check: "Chaperones, first aid bag, meds", who: "Guides" },
  { n: 12, check: "Families told?", who: "Terrence" },
];

export const CHECKLIST_TITLE = "Run this before every workshop, mobile squad or Fun Friday";
