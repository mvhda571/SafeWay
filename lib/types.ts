export const SESSION_COOKIE = "sw_session";

export type Role = "parent" | "school_admin" | "super_admin";
export const ROLES: Role[] = ["parent", "school_admin", "super_admin"];

export type Category =
  | "open_manhole"
  | "unlit_street"
  | "stray_dogs"
  | "speeding"
  | "no_crossing"
  | "construction"
  | "broken_light"
  | "other";
export type Severity = "low" | "medium" | "high";
export type Status = "active" | "investigating" | "resolved";

export const CATEGORIES: Category[] = [
  "open_manhole",
  "unlit_street",
  "stray_dogs",
  "speeding",
  "no_crossing",
  "construction",
  "broken_light",
  "other",
];
export const SEVERITIES: Severity[] = ["low", "medium", "high"];
export const STATUSES: Status[] = ["active", "investigating", "resolved"];

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  /** Profile settings (all optional). */
  lang?: "uz" | "ru" | "en" | null;
  home?: SavedPlace | null;
  school?: SavedPlace | null;
}

export interface SavedPlace { lat: number; lng: number; label: string }

export type PublicUser = Omit<User, "passwordHash">;

export interface PublicStats {
  total: number; resolved: number; resolvedPct: number; highActive: number; confirmations: number;
  byStatus: { key: Status; count: number }[];
  byCategory: { key: Category; count: number }[];
  bySeverity: { key: Severity; count: number }[];
  daily: { date: string; count: number }[];
}

export interface ProfileStats { reported: number; resolved: number; confirmed: number }

/** All ids are MongoDB ObjectId hex strings (24 chars). */
export interface Hazard {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  status: Status;
  lat: number;
  lng: number;
  /** Street address from reverse geocoding (null if the lookup failed). */
  address: string | null;
  imageUrl: string | null;
  confirmations: string[];
  statusHistory: { status: Status; at: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Hazard as sent to the client: confirmations replaced by counts, createdBy omitted for privacy. */
export interface HazardDTO extends Omit<Hazard, "confirmations" | "createdBy"> {
  confirmCount: number;
  confirmedByMe: boolean;
  authorName: string;
}

export interface TelegramLog {
  id: string;
  hazardId: string;
  text: string;
  delivered: boolean;
  error?: string | null;
  createdAt: string;
}

export interface PushSub {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
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
