import type { Metadata } from "next";
import { AdminScreen } from "./admin-screen";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return <AdminScreen />;
}
