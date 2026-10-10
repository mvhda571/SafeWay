import type { Metadata } from "next";
import { AuthScreen, type DemoAccount } from "./auth-screen";

export const metadata: Metadata = { title: "Kirish" };

/** Shown only when DEMO_MODE=true, so the credentials never reach the client bundle otherwise. */
const DEMO: DemoAccount[] = [
  { role: "parent", email: "parent@safeway.uz", password: "parent123" },
  { role: "school_admin", email: "school@safeway.uz", password: "school123" },
  { role: "super_admin", email: "admin@safeway.uz", password: "admin123" },
];

export default function LoginPage() {
  return <AuthScreen demo={process.env.DEMO_MODE === "true" ? DEMO : []} />;
}
