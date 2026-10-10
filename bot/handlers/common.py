"""
Umumiy handlerlar: /start (deep link bilan), /help, til tanlash,
statistika, favqulodda raqamlar va sozlamalar.
"""
import logging
from html import escape

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from pymongo.errors import PyMongoError

import config
import db
import keyboards as kb
import notify
from i18n import CATEGORY_EMOJI, LANG_NAMES, LANGS, fmt_distance, t
from states import SettingsStates

log = logging.getLogger(__name__)
router = Router(name="common")


# ---------------------------------------------------------------------------
# Ko'rsatish funksiyalari (menyu tugmalari ham shularni chaqiradi)
# ---------------------------------------------------------------------------

async def show_welcome(message: Message, lang: str, is_new_user: bool) -> None:
    name = escape(message.from_user.first_name or "")
    await message.answer(t(lang, "welcome", name=name), reply_markup=kb.main_menu(lang))
    if is_new_user:
        await message.answer(t(lang, "choose_lang"), reply_markup=kb.languages())


async def show_hazard(message: Message, bot: Bot, raw_id: str, lang: str) -> bool:
    """/start hz_<id> — xavf kartasini ko'rsatadi. Topilmasa False."""
    hazard_id = db.parse_object_id(raw_id)
    hazard = await db.get_hazard(hazard_id) if hazard_id else None
    if not hazard:
        await message.answer(t(lang, "hazard_not_found"), reply_markup=kb.main_menu(lang))
        return False
    await notify.send_card(bot, message.chat.id, hazard, lang, kb.hazard_card(str(hazard["_id"]), lang))
    return True


async def show_stats(message: Message, lang: str) -> None:
    try:
        stats = await db.get_stats()
    except PyMongoError as exc:
        log.error("Statistika olinmadi: %s", exc)
        await message.answer(t(lang, "error"))
        return

    total = stats["total"]
    percent = round(stats["resolved"] * 100 / total) if total else 0
    by_category = "\n".join(
        f"{CATEGORY_EMOJI[category]} {t(lang, f'cat_{category}')}: <b>{stats['by_category'].get(category, 0)}</b>"
        for category in config.CATEGORIES
    )
    text = t(
        lang, "stats",
        total=total,
        resolved=stats["resolved"],
        percent=percent,
        high=stats["active_high"],
        upvotes=stats["upvotes"],
        by_category=by_category,
    )
    await message.answer(text, reply_markup=kb.stats_map(lang))


async def show_sos(message: Message, lang: str) -> None:
    inspector = escape(config.INSPECTOR_PHONE) if config.INSPECTOR_PHONE else t(lang, "not_set")
    await message.answer(t(lang, "sos", inspector=inspector))


def settings_text(user: dict, lang: str) -> str:
    subscribed = user.get("subscribed", True) is not False
    return t(
        lang, "settings",
        sub=t(lang, "on" if subscribed else "off"),
        point=t(lang, "point_set" if user.get("watchPoint") else "point_not_set"),
        language=LANG_NAMES[lang],
        radius=fmt_distance(config.NOTIFY_RADIUS, lang),
    )


async def show_settings(message: Message, user: dict, lang: str) -> None:
    await message.answer(settings_text(user, lang), reply_markup=kb.settings(user, lang))


# ---------------------------------------------------------------------------
# Buyruqlar
# ---------------------------------------------------------------------------

@router.message(CommandStart())
async def cmd_start(
    message: Message,
    command: CommandObject,
    state: FSMContext,
    bot: Bot,
    lang: str,
    is_new_user: bool = False,
) -> None:
    await state.clear()
    args = (command.args or "").strip()

    # Deep link: /start hz_<id> — xavf kartasi
    if args.startswith("hz_"):
        try:
            await show_hazard(message, bot, args[3:], lang)
        except PyMongoError as exc:
            log.error("Xavf olinmadi: %s", exc)
            await message.answer(t(lang, "error"))
        if is_new_user:
            await show_welcome(message, lang, is_new_user)
        return

    await show_welcome(message, lang, is_new_user)


@router.message(Command("help"))
async def cmd_help(message: Message, lang: str) -> None:
    await message.answer(t(lang, "help"), reply_markup=kb.main_menu(lang))


# ---------------------------------------------------------------------------
# Til tanlash: lang:<uz|ru|en>
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("lang:"))
async def on_lang(callback: CallbackQuery, bot: Bot, lang: str) -> None:
    code = callback.data.split(":", 1)[1]
    if code not in LANGS:
        await callback.answer(t(lang, "callback_expired"))
        return

    try:
        await db.set_user_lang(callback.from_user.id, code)
    except PyMongoError as exc:
        log.error("Til saqlanmadi: %s", exc)
        await callback.answer(t(lang, "error"), show_alert=True)
        return

    await callback.answer(t(code, "lang_changed"))
    if isinstance(callback.message, Message):
        try:
            await callback.message.edit_text(t(code, "lang_changed"))
        except TelegramBadRequest:
            pass
    # Reply klaviatura matnlari yangi tilda bo'lishi uchun menyuni qayta yuboramiz
    await bot.send_message(callback.from_user.id, t(code, "menu"), reply_markup=kb.main_menu(code))


# ---------------------------------------------------------------------------
# Sozlamalar: set:sub / set:loc / set:lang
# ---------------------------------------------------------------------------

@router.callback_query(F.data == "set:sub")
async def on_toggle_subscription(callback: CallbackQuery, lang: str) -> None:
    try:
        user = await db.toggle_subscribed(callback.from_user.id)
    except PyMongoError as exc:
        log.error("Obuna o'zgartirilmadi: %s", exc)
        user = None
    if not user:
        await callback.answer(t(lang, "error"), show_alert=True)
        return

    subscribed = user.get("subscribed", True) is not False
    await callback.answer(t(lang, "sub_on_alert" if subscribed else "sub_off_alert"))
    if isinstance(callback.message, Message):
        try:
            await callback.message.edit_text(settings_text(user, lang), reply_markup=kb.settings(user, lang))
        except TelegramBadRequest:
            pass


@router.callback_query(F.data == "set:loc")
async def on_set_point(callback: CallbackQuery, state: FSMContext, bot: Bot, user: dict, lang: str) -> None:
    await state.clear()
    await state.set_state(SettingsStates.waiting_watch_point)
    extra = [t(lang, "btn_remove_point")] if user.get("watchPoint") else None
    await callback.answer()
    await bot.send_message(callback.from_user.id, t(lang, "point_ask"), reply_markup=kb.location_request(lang, extra))


@router.callback_query(F.data == "set:lang")
async def on_change_lang(callback: CallbackQuery, bot: Bot) -> None:
    await callback.answer()
    await bot.send_message(callback.from_user.id, t("uz", "choose_lang"), reply_markup=kb.languages())
