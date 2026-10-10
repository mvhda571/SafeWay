import "server-only";
import type { Hazard, HazardDTO } from "./types";
import { userNames } from "./store";

function abbreviateName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "SafeWay";
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export async function toDTOs(hazards: Hazard[], userId?: string): Promise<HazardDTO[]> {
  const names = await userNames(hazards.map((h) => h.createdBy));
  return hazards.map(({ confirmations, ...h }) => ({
    ...h,
    confirmCount: confirmations.length,
    confirmedByMe: !!userId && confirmations.includes(userId),
    authorName: (() => { const n = names.get(h.createdBy); return n ? abbreviateName(n) : h.createdBy.startsWith("tg:") ? "Telegram" : "SafeWay"; })(),
  }));
}
