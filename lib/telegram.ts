import "server-only";
import type { Hazard } from "./types";
import { addTelegram } from "./store";

const CATEGORY_UZ: Record<Hazard["category"], string> = {
  open_manhole: "Ochiq lyuk",
  unlit_street: "Yoritilmagan ko'cha",
  stray_dogs: "Qarovsiz itlar",
  speeding: "Tezkor haydovchilar",
};

export function buildTelegramMessage(h: Hazard, author: string) {
  const map = `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lng}#map=18/${h.lat}/${h.lng}`;
  return [
    "🔴 <b>YUQORI XAVF — SafeWay</b>",
    "",
    `📌 <b>${escape(h.title)}</b>`,
    `🏷 Kategoriya: ${CATEGORY_UZ[h.category]}`,
    `📝 ${escape(h.description)}`,
    `📍 <a href="${map}">${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}</a>`,
    `👤 Xabar berdi: ${escape(author)}`,
    `🕒 ${new Date(h.createdAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    "",
    "⚠️ Farzandlaringizni ushbu hududdan ehtiyot bo'lishga chaqiring!",
  ].join("\n");
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends the alert via Telegram Bot API when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
 * are configured; otherwise it is only logged (simulation mode) and shown in the admin panel.
 */
export async function notifyHighHazard(h: Hazard, author: string) {
  const text = buildTelegramMessage(h, author);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let delivered = false;
  if (token && chatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      delivered = res.ok;
    } catch (e) {
      console.error("Telegram send failed", e);
    }
  }
  return addTelegram({ hazardId: h.id, text, delivered });
}
