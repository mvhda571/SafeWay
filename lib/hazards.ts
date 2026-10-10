import "server-only";
import type { Hazard, HazardDTO } from "./types";
import { userNames } from "./store";

export async function toDTOs(hazards: Hazard[], userId?: string): Promise<HazardDTO[]> {
  const names = await userNames(hazards.map((h) => h.createdBy));
  return hazards.map(({ confirmations, ...h }) => ({
    ...h,
    confirmCount: confirmations.length,
    confirmedByMe: !!userId && confirmations.includes(userId),
    authorName: names.get(h.createdBy) ?? (h.createdBy.startsWith("tg:") ? "Telegram" : "SafeWay"),
  }));
}
