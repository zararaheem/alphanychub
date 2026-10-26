import { cookies } from "next/headers";
import { parseCampus, type Campus } from "@/lib/campus";

export const CAMPUS_COOKIE = "hub_campus";

// The campus picked in the top toggle (null = both campuses).
export async function currentCampus(): Promise<Campus | null> {
  return parseCampus((await cookies()).get(CAMPUS_COOKIE)?.value);
}
