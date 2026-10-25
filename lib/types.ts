import type { Campus, CampusScope } from "@/lib/campus";

export type Contact = {
  id: number; campus: CampusScope; name: string; role: string | null;
  phone: string | null; email: string | null; notes: string | null; sort: number;
};

export type Procedure = { id: number; campus: CampusScope; title: string; body: string; sort: number };

export type TripStatus = "planned" | "approved" | "out" | "returned" | "cancelled";

export type Trip = {
  id: number; campus: Campus; trip_date: string; depart_time: string | null; return_time: string | null;
  destination: string; group_name: string | null; lead_staff: string | null; headcount: number | null;
  transport: string | null; status: TripStatus; notes: string | null; created_by: string | null;
};

export type Workshop = {
  id: number; campus: CampusScope; day: string; start_time: string | null; end_time: string | null;
  topic: string; notes: string | null;
};

export const TRIP_STATUS: Record<TripStatus, { label: string; tone: string }> = {
  planned: { label: "Planned", tone: "" },
  approved: { label: "Approved", tone: "mint" },
  out: { label: "Off campus now", tone: "amber" },
  returned: { label: "Back on campus", tone: "teal" },
  cancelled: { label: "Cancelled", tone: "red" },
};
