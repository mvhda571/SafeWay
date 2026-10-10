"""
Joylashuv bilan bog'liq handlerlar:
"Atrofimda" (500 m ichidagi faol xavflar) va maktab/uy nuqtasini (watchPoint) belgilash.
"""
import logging
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from pymongo.errors import PyMongoError

import config
import db
import keyboards as kb
from i18n import SEVERITY_EMOJI, cat_label, fmt_distance, t, variants
from states import NearbyStates, SettingsStates

log = logging.getLogger(__name__)
router = Router(name="places")


# ---------------------------------------------------------------------------
# Atrofimda
# ---------------------------------------------------------------------------

async def ask_nearby(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await state.set_state(NearbyStates.waiting_location)
    await message.answer(t(lang, "nearby_ask"), reply_markup=kb.location_request(lang))


async def show_nearby(message: Message, bot: Bot, lang: str, restore_menu: bool) -> None:
    """Yuborilgan joylashuv atrofidagi faol xavflar ro'yxati."""
    lat, lng = message.location.latitude, message.location.longitude
    try:
        items = await db.nearby_hazards(lat, lng, config.NEARBY_RADIUS, config.NEARBY_LIMIT)
    except PyMongoError as exc:
        log.error("Atrofdagi xavflarni olishda xato: %s", exc)
        await message.answer(t(lang, "error"), reply_markup=kb.main_menu(lang))
        return

    map_markup = kb.nearby_map(lat, lng, lang)

    if not items:
        text = t(lang, "nearby_none")
    else:
        me = await bot.me()
        lines = [t(lang, "nearby_title", count=len(items)), ""]
        for index, hazard in enumerate(items, start=1):
            sev_emoji = SEVERITY_EMOJI.get(hazard.get("severity"), "⚪")
            distance = fmt_distance(hazard.get("distance", 0), lang)
            upvotes = int(hazard.get("upvotes") or 0)
            link = f"https://t.me/{me.username}?start=hz_{hazard['_id']}"
            lines.append(
                f"{index}. {sev_emoji} {cat_label(lang, hazard.get('category'))} — "
                f"<b>{distance}</b> · 👁 {upvotes}"
            )
            address = (hazard.get("address") or "").strip()
            details = f'<a href="{link}">{t(lang, "nearby_details")}</a>'
            lines.append(f"    📍 {escape(address[:80])} · {details}" if address else f"    {details}")
        text = "\n".join(lines)

    if restore_menu:
        # Joylashuv so'rash klaviaturasi o'rniga asosiy menyuni qaytaramiz
        await message.answer(text, reply_markup=kb.main_menu(lang))
        if map_markup:
            await message.answer(t(lang, "nearby_map_hint"), reply_markup=map_markup)
    else:
        await message.answer(text, reply_markup=map_markup)


@router.message(NearbyStates.waiting_location, F.location)
async def nearby_location(message: Message, state: FSMContext, bot: Bot, lang: str) -> None:
    await state.clear()
    await show_nearby(message, bot, lang, restore_menu=True)


@router.message(StateFilter(None), F.location)
async def location_without_process(message: Message, bot: Bot, lang: str) -> None:
    """Jarayonsiz yuborilgan joylashuv ham "Atrofimda" sifatida ishlaydi."""
    await show_nearby(message, bot, lang, restore_menu=False)


@router.message(NearbyStates.waiting_location)
async def nearby_location_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "nearby_location_only"), reply_markup=kb.location_request(lang))


# ---------------------------------------------------------------------------
# Maktab/uy nuqtasi (users.watchPoint)
# ---------------------------------------------------------------------------

@router.message(SettingsStates.waiting_watch_point, F.location)
async def watch_point_location(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    try:
        await db.set_watch_point(message.from_user.id, message.location.latitude, message.location.longitude)
    except PyMongoError as exc:
        log.error("watchPoint saqlanmadi: %s", exc)
        await message.answer(t(lang, "error"), reply_markup=kb.main_menu(lang))
        return
    radius = fmt_distance(config.NOTIFY_RADIUS, lang)
    await message.answer(t(lang, "point_saved", radius=radius), reply_markup=kb.main_menu(lang))


@router.message(SettingsStates.waiting_watch_point, F.text.in_(variants("btn_remove_point")))
async def watch_point_remove(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    try:
        await db.clear_watch_point(message.from_user.id)
    except PyMongoError as exc:
        log.error("watchPoint o'chirilmadi: %s", exc)
        await message.answer(t(lang, "error"), reply_markup=kb.main_menu(lang))
        return
    await message.answer(t(lang, "point_removed"), reply_markup=kb.main_menu(lang))


@router.message(SettingsStates.waiting_watch_point)
async def watch_point_expected(message: Message, user: dict, lang: str) -> None:
    extra = [t(lang, "btn_remove_point")] if user.get("watchPoint") else None
    await message.answer(t(lang, "point_location_only"), reply_markup=kb.location_request(lang, extra))
