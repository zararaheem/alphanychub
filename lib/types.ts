import type { CampusScope } from "@/lib/campus";

export type Contact = {
  id: number; campus: CampusScope; name: string; role: string | null;
  phone: string | null; email: string | null; notes: string | null; sort: number;
};

export type Procedure = { id: number; campus: CampusScope; title: string; body: string; sort: number };

export type Workshop = {
  id: number; campus: CampusScope; day: string; start_time: string | null; end_time: string | null;
  topic: string; notes: string | null;
};
