import type { Metadata } from "next";
import { ProfileScreen } from "./profile-screen";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return <ProfileScreen />;
}
