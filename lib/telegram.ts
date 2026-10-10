import "server-only";
import type { Hazard } from "./types";
import { addTelegram } from "./store";

export const CATEGORY_UZ: Record<Hazard["category"], string> = {
  open_manhole: "Ochiq lyuk",
  unlit_street: "Yoritilmagan ko'cha",
  stray_dogs: "Qarovsiz itlar",
  speeding: "Tezkor haydovchilar",
};

export function buildTelegramMessage(h: Hazard, author: string, origin: string) {
  const gmaps = `https://www.google.com/maps?q=${h.lat},${h.lng}`;
  const page = `${origin.replace(/\/$/, "")}/hazards/${h.id}`;
  return [
    "🔴 <b>YUQORI XAVF — SafeWay</b>",
    "",
    `🏷 <b>Tur:</b> ${CATEGORY_UZ[h.category]}`,
    `📌 <b>${escape(h.title)}</b>`,
    `📍 <b>Manzil:</b> ${escape(h.address ?? `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`)}`,
    h.description ? `📝 <b>Izoh:</b> ${escape(h.description)}` : null,
    `👤 Xabar berdi: ${escape(author)}`,
    `🕒 ${new Date(h.createdAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    "",
    `🗺 <a href="${gmaps}">Google Maps'da ochish</a>`,
    `🔗 <a href="${page}">SafeWay'da batafsil</a>`,
    "",
    "⚠️ Farzandlaringizni ushbu hududdan ehtiyot bo'lishga chaqiring!",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Posts the alert to the parents' channel (BOT_TOKEN → TELEGRAM_CHANNEL_ID). The bot must be an
 * admin of the channel. Without both env vars it runs in simulation mode: the message is only
 * logged and shown in the admin panel. Never throws.
 */
export async function notifyHighHazard(h: Hazard, author: string, origin: string) {
  const text = buildTelegramMessage(h, author, origin);
  const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID;
  let delivered = false;
  let error: string | null = null;
  if (token && chatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
        signal: AbortSignal.timeout(4000),
      });
      delivered = res.ok;
      if (!res.ok) error = ((await res.json().catch(() => ({}))) as { description?: string }).description ?? `HTTP ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    if (error) console.error("Telegram send failed:", error);
  } else {
    error = "simulation";
  }
  const entry = { hazardId: h.id, text, delivered, error };
  try {
    return await addTelegram(entry);
  } catch (e) {
    console.error("Telegram log failed", e);
    return { ...entry, id: "", createdAt: new Date().toISOString() };
  }
}
