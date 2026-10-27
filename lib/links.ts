// Other Alpha NYC apps the hub links out to. Set in Vercel env vars.
export const ATTENDANCE_URL = process.env.NEXT_PUBLIC_ATTENDANCE_URL || null;
export const OFF_CAMPUS_URL = process.env.NEXT_PUBLIC_OFF_CAMPUS_URL || null;
// Transport requests (shuttles, buses) for both campuses.
export const TRANSPORT_URL = process.env.NEXT_PUBLIC_TRANSPORT_URL || "https://transportation-tracker-production.up.railway.app/";
// What families see (the Alpha NYC Families app).
export const PARENT_VIEW_URL = process.env.NEXT_PUBLIC_PARENT_VIEW_URL || "https://alpha-nyc-hub.vercel.app";
