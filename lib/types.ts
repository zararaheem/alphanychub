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

export type ParentContact = {
  id: number; campus: "early-years" | "maiden-ln"; student: string; grade: string | null; guardian: string | null;
  relationship: string | null; phone: string | null; email: string | null; notes: string | null; sort: number;
  imported_at: string;
};

export type StaffCampus = CampusScope | "unassigned";

export type StaffMember = {
  id: number; campus: StaffCampus; name: string; title: string | null; team: string | null;
  email: string | null; phone: string | null; notes: string | null; sort: number;
};

export type Student = {
  id: number; first_name: string; last_name: string; grade: string | null; level: string | null;
  campus: "early-years" | "maiden-ln";
};

export type Medication = {
  id: number; student: string; level: string | null; campus: "early-years" | "maiden-ln"; medication: string;
  dose: string | null; route: string | null; schedule: string; times: string | null; storage: string | null;
  instructions: string | null; active: boolean; updated_at: string;
};
