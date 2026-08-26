import { USERS } from "./users";
import type { StaffMember } from "./types";

// Roster detail the login roster does not carry. Keyed by name so it stays
// readable against src/lib/constants.ts MECHANICS.
type StaffDetail = Pick<StaffMember, "phone" | "joinedAt" | "shift" | "skills" | "active">;

const DETAIL: Record<string, StaffDetail> = {
  Appi:    { phone: "+91 98450 11201", joinedAt: "2022-03-14", shift: "FULL",    skills: ["Gear tuning", "Brake bleed", "Wheel truing"], active: true },
  Sanjay:  { phone: "+91 98450 11202", joinedAt: "2023-01-09", shift: "MORNING", skills: ["Washing", "Detailing", "Chain care"], active: true },
  Baba:    { phone: "+91 98450 11203", joinedAt: "2021-07-22", shift: "FULL",    skills: ["Frame alignment", "Fork service", "Suspension"], active: true },
  Mohan:   { phone: "+91 98450 11204", joinedAt: "2023-11-02", shift: "EVENING", skills: ["Assembly", "Packing", "Inventory"], active: true },
  Iqbal:   { phone: "+91 98450 11205", joinedAt: "2024-02-18", shift: "MORNING", skills: ["Delivery", "Pickup", "Road test"], active: true },
  Mujju:   { phone: "+91 98450 11206", joinedAt: "2022-09-30", shift: "FULL",    skills: ["E-cycle wiring", "Battery test", "Motor service"], active: true },
  Shravan: { phone: "+91 98450 11207", joinedAt: "2020-05-11", shift: "FULL",    skills: ["Job allocation", "Quality check", "Escalations"], active: true },
  Ibrahim: { phone: "+91 98450 11208", joinedAt: "2019-01-15", shift: "FULL",    skills: ["Operations", "Pricing", "Vendor relations"], active: true },
};

export const STAFF: StaffMember[] = USERS.map((u) => ({ ...u, ...DETAIL[u.name] }));
