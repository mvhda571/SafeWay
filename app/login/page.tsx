import type { Metadata } from "next";
import { AuthScreen } from "./auth-screen";

export const metadata: Metadata = { title: "Kirish" };

export default function LoginPage() {
  return <AuthScreen />;
}
