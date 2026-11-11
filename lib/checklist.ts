// Run before every workshop, mobile squad or Fun Friday (staff morning meetings, Oct 26–30).
import { ATTENDANCE_URL, OFF_CAMPUS_URL, TRANSPORT_URL } from "@/lib/links";

export type CheckLink = { label: string; href: string };
export type CheckItem = { n: number; check: string; who: string; how?: string; link?: CheckLink | null };

const offCampus = { label: "Off-campus tracker", href: OFF_CAMPUS_URL };
const attendance = ATTENDANCE_URL ? { label: "Attendance", href: ATTENDANCE_URL } : null;
const transport = { label: "Transport request", href: TRANSPORT_URL };
const meds = { label: "Student medications", href: "/health" };

export const CORE_SIX: CheckItem[] = [
  { n: 1, check: "Waiver needed?", who: "Zara", how: "Anything physical or run by an outside provider. Ask before you book." },
  { n: 2, check: "Vendor or off-site activity needing a contract?", who: "Zara + Legal", how: "Don't sign until you get the go-ahead." },
  { n: 3, check: "On the off-campus app?", who: "Emily", how: "Log the trip: lead, students, leave and return times.", link: offCampus },
  { n: 4, check: "Off-campus attendance?", who: "Julianne", how: "Mark students out when you leave and back in when you return.", link: attendance },
  { n: 5, check: "Guard needed?", who: "Zara", how: "Every trip needs security clearance. Run it on the tracker or ask Zara.", link: offCampus },
  { n: 6, check: "Transportation needed / booked?", who: "Julianne", how: "Shuttles and buses for both campuses.", link: transport },
];

export const ALSO_CHECK: CheckItem[] = [
  { n: 7, check: "Photos or video? Media release", who: "Julianne", how: "Only film or post students who have a release on file." },
  { n: 8, check: "Change of lunch plans?", who: "Julianne · Emerly (EY)", how: "Tell them early if students will miss lunch or need it packed. Early Years: Emerly." },
  { n: 9, check: "Guests or vendors coming in?", who: "Julianne / Zara", how: "Send names ahead. Guests and vendors check in and stay escorted." },
  { n: 10, check: "Room or setup change?", who: "Ops", how: "Tables, AV, a different room or floor." },
  { n: 11, check: "Chaperones, first aid bag, meds", who: "Guides", how: "Two adults minimum, roster, first aid bag and any student meds.", link: meds },
  { n: 12, check: "Families told?", who: "Terrence (DoP)", how: "The DoP sends all parent messages. Don't message families yourself." },
];

export const CHECKLIST_TITLE = "Run this before every workshop, mobile squad or Fun Friday";
export const CHECKLIST_LINKS: CheckLink[] = [offCampus, ...(attendance ? [attendance] : []), transport, meds];
