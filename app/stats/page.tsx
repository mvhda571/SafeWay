import type { Metadata } from "next";
import { StatsScreen } from "./stats-screen";

export const metadata: Metadata = { title: "Statistika" };

export default function StatsPage() {
  return <StatsScreen />;
}
