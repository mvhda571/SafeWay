"""
Xavf kartasidagi amallar:
  up:<id>            — "👁 Men ham ko'rdim +1" (har kim, bir marta)
  st:<id>:<status>   — holatni o'zgartirish (faqat admin)
  del:<id>           — soxta xabarni o'chirish (faqat admin)
"""
import logging
from html import escape

from aiogram import Bot, F, Router
from aiogram.types import CallbackQuery, Message
from pymongo.errors import PyMongoError

import config
import db
import keyboards as kb
import notify
from i18n import status_label, t

log = logging.getLogger(__name__)
router = Router(name="hazard_actions")


def _is_admin(callback: CallbackQuery) -> bool:
    return callback.from_user.id in config.ADMIN_IDS


# ---------------------------------------------------------------------------
# +1 tasdiq
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("up:"))
async def on_upvote(callback: CallbackQuery, lang: str) -> None:
    hazard_id = db.parse_object_id(callback.data[3:])
    if not hazard_id:
        await callback.answer(t(lang, "callback_expired"))
        return

    try:
        result, hazard = await db.upvote_hazard(hazard_id, f"tg:{callback.from_user.id}")
    except PyMongoError as exc:
        log.error("+1 saqlanmadi: %s", exc)
        await callback.answer(t(lang, "error"), show_alert=True)
        return

    if result == "not_found":
        await callback.answer(t(lang, "hazard_not_found"), show_alert=True)
        return
    if result == "resolved":
        await callback.answer(t(lang, "upvote_resolved"), show_alert=True)
        return
    if result == "already":
        await callback.answer(t(lang, "upvote_already"), show_alert=True)
        return

    await callback.answer(t(lang, "upvote_ok"))

    # Kartadagi tasdiqlar sonini yangilaymiz (sarlavha va tugmalar saqlanadi)
    message = callback.message
    if isinstance(message, Message):
        text = notify.card_text(hazard, lang, header=notify.extract_header(message))
        await notify.edit_card(message, text, message.reply_markup)


# ---------------------------------------------------------------------------
# Moderatsiya: holatni o'zgartirish
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("st:"))
async def on_status(callback: CallbackQuery, bot: Bot, lang: str) -> None:
    if not _is_admin(callback):
        await callback.answer(t(lang, "admin_only"), show_alert=True)
        return

    parts = callback.data.split(":")
    hazard_id = db.parse_object_id(parts[1]) if len(parts) == 3 else None
    status = parts[2] if len(parts) == 3 else None
    if not hazard_id or status not in config.STATUSES:
        await callback.answer(t(lang, "callback_expired"))
        return

    try:
        current = await db.get_hazard(hazard_id)
        if not current:
            await callback.answer(t(lang, "hazard_not_found"), show_alert=True)
            return
        if current.get("status") == status:
            await callback.answer(t(lang, "mod_status_same"))
            return
        hazard = await db.set_hazard_status(hazard_id, status)
    except PyMongoError as exc:
        log.error("Holat o'zgartirilmadi: %s", exc)
        await callback.answer(t(lang, "error"), show_alert=True)
        return

    if not hazard:
        await callback.answer(t(lang, "hazard_not_found"), show_alert=True)
        return

    await callback.answer(t(lang, "mod_status_changed", status=status_label(lang, status)), show_alert=True)

    header = await notify.moderation_header(hazard, lang)
    text = notify.card_text(hazard, lang, header=header)
    await notify.edit_card(callback.message, text, kb.moderation(str(hazard_id), status, lang))

    # Xabar bergan odamga bildirishnoma — fonda
    notify.run_background(notify.notify_reporter_status(bot, hazard))


# ---------------------------------------------------------------------------
# Moderatsiya: soxta xabarni o'chirish
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("del:"))
async def on_delete(callback: CallbackQuery, lang: str) -> None:
    if not _is_admin(callback):
        await callback.answer(t(lang, "admin_only"), show_alert=True)
        return

    hazard_id = db.parse_object_id(callback.data[4:])
    if not hazard_id:
        await callback.answer(t(lang, "callback_expired"))
        return

    try:
        deleted = await db.delete_hazard(hazard_id)
    except PyMongoError as exc:
        log.error("Xavf o'chirilmadi: %s", exc)
        await callback.answer(t(lang, "error"), show_alert=True)
        return

    if not deleted:
        await callback.answer(t(lang, "hazard_not_found"), show_alert=True)
    else:
        await callback.answer(t(lang, "mod_deleted_alert"), show_alert=True)

    admin = escape(callback.from_user.full_name)
    await notify.edit_card(callback.message, t(lang, "mod_deleted", admin=admin, id=str(hazard_id)), None)
