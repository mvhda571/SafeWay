export const SESSION_COOKIE = "sw_session";

export type Role ="parent" | "school_admin" | "super_admin";

export type Category = "open_manhole" | "unlit_street" | "stray_dogs" | "speeding";
export type Severity = "low" | "medium" | "high";
export type Status = "active" | "investigating" | "resolved";

export const CATEGORIES: Category[] = ["open_manhole", "unlit_street", "stray_dogs", "speeding"];
export const SEVERITIES: Severity[] = ["low", "medium", "high"];
export const STATUSES: Status[] = ["active", "investigating", "resolved"];

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

export interface Hazard {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  status: Status;
  lat: number;
  lng: number;
  imageUrl: string | null;
  confirmations: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Hazard as sent to the client: confirmation user ids are replaced by counts. */
export interface HazardDTO extends Omit<Hazard, "confirmations"> {
  confirmCount: number;
  confirmedByMe: boolean;
  authorName: string;
}

export interface TelegramLog {
  id: string;
  hazardId: string;
  text: string;
  delivered: boolean;
  createdAt: string;
}

export interface Session {
  sub: string;
  name: string;
  email: string;
  role: Role;
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#facc15",
  medium: "#f97316",
  high: "#ef4444",
};

export function isAdmin(role: Role | undefined | null) {
  return role === "school_admin" || role === "super_admin";
}
