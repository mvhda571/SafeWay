import "server-only";
import webpush from "web-push";
import type { Hazard } from "./types";
import { listPushSubs } from "./store";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const CONTACT = process.env.VAPID_CONTACT ?? "mailto:admin@safeway.uz";

function isConfigured() {
  return PUBLIC_KEY && PRIVATE_KEY;
}

if (isConfigured()) {
  webpush.setVapidDetails(CONTACT, PUBLIC_KEY, PRIVATE_KEY);
}

export async function notifyNewHazard(h: Hazard) {
  if (!isConfigured()) return;
  const subs = await listPushSubs();
  if (!subs.length) return;

  const SEV_EMOJI: Record<Hazard["severity"], string> = { low: "🟡", medium: "🟠", high: "🔴" };
  const CAT_UZ: Record<Hazard["category"], string> = {
    open_manhole: "Ochiq lyuk",
    unlit_street: "Yoritilmagan ko'cha",
    stray_dogs: "Qarovsiz itlar",
    speeding: "Tezkor haydovchilar",
  };

  const payload = JSON.stringify({
    title: `${SEV_EMOJI[h.severity]} SafeWay — Yangi xavf`,
    body: `${CAT_UZ[h.category]}: ${h.title}`,
    hazardId: h.id,
    url: "/map",
  });

  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload).catch(() => null),
    ),
  );
}
