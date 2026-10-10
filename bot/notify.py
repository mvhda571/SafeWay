"""
Xavf kartasi, xabarlarni xavfsiz yuborish, moderatorlarga va ota-onalarga xabarnomalar.
"""
import asyncio
import logging
from html import escape
from typing import Awaitable, Callable, Coroutine

from aiogram import Bot
from aiogram.exceptions import (
    TelegramAPIError,
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramRetryAfter,
)
from aiogram.types import BufferedInputFile, InlineKeyboardMarkup, Message
from pymongo.errors import PyMongoError

import config
import db
import keyboards as kb
from i18n import SEVERITY_EMOJI, cat_label, fmt_distance, norm_lang, status_label, t

log = logging.getLogger(__name__)

CAPTION_LIMIT = 1024       # Telegram rasm izohi chegarasi
BATCH_SIZE = 25            # shuncha xabardan keyin pauza
BATCH_PAUSE = 1.1          # pauza, soniya

# ---------------------------------------------------------------------------
# Fon vazifalari (foydalanuvchi kutib qolmasligi uchun)
# ---------------------------------------------------------------------------

_background_tasks: set[asyncio.Task] = set()


def run_background(coro: Coroutine) -> None:
    """Korutinani fonda ishga tushiradi (task'ga havola saqlanadi, GC o'chirib yubormasin)."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# ---------------------------------------------------------------------------
# Xavf kartasi
# ---------------------------------------------------------------------------

def card_text(hazard: dict, lang: str, header: str | None = None) -> str:
    """Xavf kartasining HTML matni."""
    severity = hazard.get("severity")
    lines: list[str] = []
    if header:
        lines += [header, ""]

    lines.append(t(
        lang, "card_title",
        sev_emoji=SEVERITY_EMOJI.get(severity, "⚪"),
        category=cat_label(lang, hazard.get("category")),
        severity=t(lang, f"sev_{severity}"),
    ))
    lines.append(t(lang, "card_status", status=status_label(lang, hazard.get("status"))))

    address = (hazard.get("address") or "").strip()
    if address:
        lines.append(t(lang, "card_address", address=escape(address[:200])))

    description = (hazard.get("description") or "").strip()
    if description:
        lines.append(t(lang, "card_description", description=escape(description[:config.DESCRIPTION_MAX])))

    if hazard.get("hasImage"):
        lines.append(t(lang, "card_photo"))

    lines.append(t(lang, "card_confirmed", count=int(hazard.get("upvotes") or 0)))

    coords = (hazard.get("location") or {}).get("coordinates") or []
    if len(coords) == 2:
        lng, lat = coords
        lines.append(f'<a href="https://www.google.com/maps?q={lat:.6f},{lng:.6f}">{t(lang, "card_maps")}</a>')

    return "\n".join(lines)


def extract_header(message: Message) -> str | None:
    """
    Karta ustidagi sarlavhani (masalan, "🚨 Diqqat...") ajratib oladi —
    karta yangilanganda sarlavha yo'qolmasligi uchun.
    """
    html_text = message.html_text or ""
    parts = html_text.split("\n\n", 1)
    if len(parts) == 2 and not parts[0].startswith(tuple(SEVERITY_EMOJI.values()) + ("⚪",)):
        return parts[0]
    return None


async def send_card(
    bot: Bot,
    chat_id: int,
    hazard: dict,
    lang: str,
    reply_markup: InlineKeyboardMarkup | None = None,
    header: str | None = None,
) -> Message:
    """Kartani yuboradi: rasm bo'lsa — rasm bilan, aks holda matn."""
    text = card_text(hazard, lang, header)
    if hazard.get("hasImage") and len(text) <= CAPTION_LIMIT:
        try:
            image = await db.get_hazard_image(hazard["_id"])
        except PyMongoError as exc:
            log.warning("Rasmni o'qib bo'lmadi: %s", exc)
            image = None
        if image:
            try:
                return await bot.send_photo(
                    chat_id,
                    photo=BufferedInputFile(image, filename="hazard.jpg"),
                    caption=text,
                    reply_markup=reply_markup,
                )
            except TelegramBadRequest as exc:
                log.warning("Rasm yuborilmadi, matn yuboriladi: %s", exc)
    return await bot.send_message(chat_id, text, reply_markup=reply_markup)


async def edit_card(message: Message | None, text: str, reply_markup: InlineKeyboardMarkup | None) -> None:
    """Karta xabarini tahrirlaydi (rasmli bo'lsa — izohini)."""
    if not isinstance(message, Message):
        return
    try:
        if message.photo:
            if len(text) <= CAPTION_LIMIT:
                await message.edit_caption(caption=text, reply_markup=reply_markup)
            else:
                await message.edit_reply_markup(reply_markup=reply_markup)
        else:
            await message.edit_text(text, reply_markup=reply_markup)
    except TelegramBadRequest as exc:
        if "not modified" not in str(exc):
            log.debug("Kartani tahrirlab bo'lmadi: %s", exc)


# ---------------------------------------------------------------------------
# Xavfsiz yuborish
# ---------------------------------------------------------------------------

async def deliver(chat_id: int, call: Callable[[], Awaitable]) -> bool:
    """
    Telegram so'rovini bajaradi: RetryAfter bo'lsa kutib qayta urinadi,
    foydalanuvchi botni bloklagan bo'lsa — users.blocked = true.
    """
    for _ in range(3):
        try:
            await call()
            return True
        except TelegramRetryAfter as exc:
            log.warning("Flood limit: %s s kutamiz", exc.retry_after)
            await asyncio.sleep(exc.retry_after + 1)
        except TelegramForbiddenError:
            try:
                await db.mark_blocked(chat_id)
            except PyMongoError as exc:
                log.warning("blocked belgilanmadi (%s): %s", chat_id, exc)
            return False
        except TelegramBadRequest as exc:
            log.warning("Xabar yuborilmadi (%s): %s", chat_id, exc)
            return False
        except TelegramAPIError as exc:
            log.warning("Telegram xatosi (%s): %s", chat_id, exc)
            return False
    return False


async def safe_send(bot: Bot, chat_id: int, text: str, reply_markup: InlineKeyboardMarkup | None = None) -> bool:
    return await deliver(chat_id, lambda: bot.send_message(chat_id, text, reply_markup=reply_markup))


# ---------------------------------------------------------------------------
# Moderatsiya
# ---------------------------------------------------------------------------

async def moderation_header(hazard: dict, lang: str) -> str:
    """Moderator uchun sarlavha: muallif va xavf ID'si."""
    tg_id = hazard.get("reporterTgId")
    author = t(lang, "unknown_author")
    if tg_id:
        try:
            reporter = await db.get_user(tg_id)
        except PyMongoError:
            reporter = None
        name = escape((reporter or {}).get("firstName") or str(tg_id))
        author = f'<a href="tg://user?id={tg_id}">{name}</a>'
        username = (reporter or {}).get("username")
        if username:
            author += f" @{escape(username)}"
        author += f" · <code>{tg_id}</code>"
    return t(lang, "mod_header", author=author, id=str(hazard["_id"]))


async def _admin_lang(admin_id: int) -> str:
    try:
        admin = await db.get_user(admin_id)
    except PyMongoError:
        admin = None
    return norm_lang((admin or {}).get("lang"))


async def notify_admins(bot: Bot, hazard: dict) -> None:
    """Yangi xavfni barcha moderatorlarga holat tugmalari bilan yuboradi."""
    hazard_id = str(hazard["_id"])
    status = hazard.get("status") or "active"
    for admin_id in config.ADMIN_IDS:
        lang = await _admin_lang(admin_id)
        header = await moderation_header(hazard, lang)
        markup = kb.moderation(hazard_id, status, lang)
        await deliver(admin_id, lambda: send_card(bot, admin_id, hazard, lang, markup, header=header))


async def notify_reporter_status(bot: Bot, hazard: dict) -> None:
    """Holat o'zgarganini xabar bergan odamga bildiradi."""
    tg_id = hazard.get("reporterTgId")
    if not tg_id:
        return
    try:
        reporter = await db.get_user(tg_id)
    except PyMongoError:
        reporter = None
    if reporter and reporter.get("blocked"):
        return
    lang = norm_lang((reporter or {}).get("lang"))
    header = t(lang, "reporter_status_changed", status=status_label(lang, hazard.get("status")))
    text = card_text(hazard, lang, header)
    await safe_send(bot, tg_id, text, kb.hazard_card(str(hazard["_id"]), lang))


# ---------------------------------------------------------------------------
# Yuqori xavf haqida ommaviy ogohlantirish
# ---------------------------------------------------------------------------

async def broadcast_high_hazard(bot: Bot, hazard: dict) -> None:
    """
    1) watchPoint'i NOTIFY_RADIUS ichida bo'lgan obunachilarga — masofasi bilan;
    2) watchPoint belgilamagan obunachilarga — umumiy ogohlantirish.
    Xabar bergan odamning o'ziga yuborilmaydi.
    """
    coords = (hazard.get("location") or {}).get("coordinates") or []
    if len(coords) != 2:
        return
    lng, lat = coords
    reporter = hazard.get("reporterTgId")
    hazard_id = str(hazard["_id"])

    cards: dict[str, str] = {}
    markups: dict[str, InlineKeyboardMarkup] = {}
    counters = {"sent": 0, "ok": 0}

    async def send_alert(user: dict, header: str, lang: str) -> None:
        tg_id = user.get("tgId")
        if not tg_id:
            return
        if lang not in cards:
            cards[lang] = card_text(hazard, lang)
            markups[lang] = kb.hazard_card(hazard_id, lang)
        ok = await safe_send(bot, tg_id, f"{header}\n\n{cards[lang]}", markups[lang])
        counters["sent"] += 1
        counters["ok"] += int(ok)
        if counters["sent"] % BATCH_SIZE == 0:
            await asyncio.sleep(BATCH_PAUSE)

    # 1) Nuqtasi yaqin bo'lganlar
    near_users = await db.users_near_point(lng, lat, config.NOTIFY_RADIUS, exclude_tg_id=reporter)
    for user in near_users:
        lang = norm_lang(user.get("lang"))
        header = t(lang, "alert_high_near", distance=fmt_distance(user.get("dist", 0), lang))
        await send_alert(user, header, lang)

    # 2) Nuqta belgilamaganlar
    async for user in db.users_without_point(exclude_tg_id=reporter):
        lang = norm_lang(user.get("lang"))
        await send_alert(user, t(lang, "alert_high_general"), lang)

    log.info(
        "Xavf %s: ogohlantirish %s/%s foydalanuvchiga yetkazildi",
        hazard_id, counters["ok"], counters["sent"],
    )


async def watch_web_hazards(bot: Bot) -> None:
    """
    Saytda qo'shilgan 🔴 xavflarni kuzatadi va obunachilarga bot ichida qo'shilgandek yuboradi.
    Sayt Netlify'da ishlaydi (10 s limit), shuning uchun ommaviy yuborishni bot bajaradi.
    """
    log.info("Sayt xavflari kuzatilmoqda (har %s s)", config.WEB_POLL_INTERVAL)
    while True:
        try:
            while (hazard := await db.claim_web_high_hazard(config.WEB_ALERT_MAX_AGE)) is not None:
                log.info("Saytdagi yuqori xavf e'lon qilinmoqda: %s", hazard["_id"])
                await broadcast_high_hazard(bot, hazard)
        except asyncio.CancelledError:
            raise
        except PyMongoError as exc:
            log.warning("Sayt xavflarini o'qib bo'lmadi: %s", exc)
        except Exception:  # noqa: BLE001 — kuzatuv hech qachon to'xtab qolmasin
            log.exception("Sayt xavfini e'lon qilishda xato")
        await asyncio.sleep(config.WEB_POLL_INTERVAL)


async def on_new_hazard(bot: Bot, hazard: dict) -> None:
    """Yangi xavf saqlangandan keyin fonda chaqiriladi."""
    try:
        await notify_admins(bot, hazard)
    except Exception:
        log.exception("Moderatorlarga yuborishda xato")

    if hazard.get("severity") == "high":
        try:
            await broadcast_high_hazard(bot, hazard)
        except Exception:
            log.exception("Ommaviy ogohlantirishda xato")

