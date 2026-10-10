"""
"Xabar berish" jarayoni (FSM, 5 bosqich):
tur → daraja → joylashuv → rasm → izoh → saqlash.
"""
import asyncio
import logging

import aiohttp
from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, PhotoSize, ReplyKeyboardRemove, User
from pymongo.errors import PyMongoError

import config
import db
import keyboards as kb
import notify
from i18n import cat_label, sev_label, t
from states import ReportStates

log = logging.getLogger(__name__)
router = Router(name="report")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"


# ---------------------------------------------------------------------------
# Yordamchi funksiyalar
# ---------------------------------------------------------------------------

async def start_report(message: Message, state: FSMContext, lang: str) -> None:
    """1-bosqich: xavf turini tanlash."""
    await state.clear()
    await state.set_state(ReportStates.category)
    await message.answer(t(lang, "report_step_category"), reply_markup=kb.categories(lang))


async def _edit(callback: CallbackQuery, text: str, reply_markup=None) -> None:
    """Callback xabarini tahrirlaydi; imkoni bo'lmasa yangi xabar yuboradi."""
    if isinstance(callback.message, Message):
        try:
            await callback.message.edit_text(text, reply_markup=reply_markup)
            return
        except TelegramBadRequest:
            pass
    await callback.bot.send_message(callback.from_user.id, text, reply_markup=reply_markup)


async def _remove_inline_keyboard(callback: CallbackQuery) -> None:
    if isinstance(callback.message, Message):
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except TelegramBadRequest:
            pass


def _pick_photo(photos: list[PhotoSize]) -> PhotoSize:
    """1280px dan katta bo'lmagan eng katta o'lcham; bunday bo'lmasa — eng kichigi."""
    fitting = [p for p in photos if max(p.width, p.height) <= config.PHOTO_MAX_SIDE]
    if fitting:
        return max(fitting, key=lambda p: p.width * p.height)
    return min(photos, key=lambda p: p.width * p.height)


async def _download_photo(bot: Bot, file_id: str) -> bytes:
    buffer = await bot.download(file_id)
    return buffer.getvalue()


async def reverse_geocode(lat: float, lng: float, lang: str) -> str | None:
    """Koordinatadan manzil (OpenStreetMap Nominatim). Xato bo'lsa None."""
    params = {
        "format": "jsonv2",
        "lat": f"{lat:.6f}",
        "lon": f"{lng:.6f}",
        "zoom": "18",
        "addressdetails": "1",
        "accept-language": lang,
    }
    headers = {"User-Agent": "SafeWayBot/1.0 (Telegram bot)"}
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            async with session.get(NOMINATIM_URL, params=params) as response:
                if response.status != 200:
                    return None
                data = await response.json(content_type=None)
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
        return None

    address = data.get("address") or {}
    street = address.get("road") or address.get("pedestrian") or address.get("footway")
    if street and address.get("house_number"):
        street = f"{street}, {address['house_number']}"
    district = address.get("suburb") or address.get("neighbourhood") or address.get("quarter")
    city = address.get("city") or address.get("town") or address.get("village")
    parts = [p for p in (street, district, city) if p]
    if parts:
        return ", ".join(dict.fromkeys(parts))

    display = data.get("display_name") or ""
    return ", ".join(display.split(", ")[:3]) or None


async def _finish(bot: Bot, chat_id: int, tg_user: User, state: FSMContext, lang: str) -> None:
    """Oxirgi bosqich: xavfni saqlash, kartani ko'rsatish, fonda xabarnomalar."""
    data = await state.get_data()
    await state.clear()  # ikki marta bosilsa ikki marta saqlanmasin

    if not all(key in data for key in ("category", "severity", "lat", "lng")):
        await bot.send_message(chat_id, t(lang, "report_expired"), reply_markup=kb.main_menu(lang))
        return

    progress = await bot.send_message(chat_id, t(lang, "report_saving"))

    # Rasm
    image: bytes | None = None
    if data.get("photo_id"):
        try:
            image = await _download_photo(bot, data["photo_id"])
        except Exception as exc:
            log.warning("Rasm yuklab olinmadi: %s", exc)
            await bot.send_message(chat_id, t(lang, "report_photo_failed"))

    # Manzil
    lat, lng = data["lat"], data["lng"]
    address = data.get("address") or await reverse_geocode(lat, lng, lang) or f"{lat:.5f}, {lng:.5f}"

    # Saqlash
    try:
        hazard = await db.create_hazard(
            category=data["category"],
            severity=data["severity"],
            lat=lat,
            lng=lng,
            address=address[:200],
            description=data.get("description") or "",
            reporter_tg_id=tg_user.id,
            image=image,
        )
    except PyMongoError as exc:
        log.error("Xavf saqlanmadi: %s", exc)
        await progress.edit_text(t(lang, "report_save_error"))
        await bot.send_message(chat_id, t(lang, "menu"), reply_markup=kb.main_menu(lang))
        return

    try:
        await progress.delete()
    except TelegramBadRequest:
        pass

    saved_text = t(lang, "report_saved")
    if hazard["severity"] == "high":
        saved_text += "\n\n" + t(lang, "report_saved_high")
    await bot.send_message(chat_id, saved_text, reply_markup=kb.main_menu(lang))
    await notify.send_card(bot, chat_id, hazard, lang, kb.hazard_card(str(hazard["_id"]), lang))

    # Moderatorlar va ota-onalarga — fonda
    notify.run_background(notify.on_new_hazard(bot, hazard))


# ---------------------------------------------------------------------------
# Inline tugmalar: rc / rs / rp
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("rc:"))
async def on_category(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    """1 → 2: tur tanlandi."""
    category = callback.data.split(":", 1)[1]
    if category not in config.CATEGORIES:
        await callback.answer(t(lang, "callback_expired"))
        return

    await state.clear()
    await state.update_data(category=category)
    await state.set_state(ReportStates.severity)
    await _edit(
        callback,
        t(lang, "report_step_severity", category=cat_label(lang, category)),
        kb.severities(lang),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("rs:"))
async def on_severity(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    """2 → 3: daraja tanlandi, joylashuv so'raladi."""
    severity = callback.data.split(":", 1)[1]
    data = await state.get_data()
    if (
        severity not in config.SEVERITIES
        or await state.get_state() != ReportStates.severity.state
        or "category" not in data
    ):
        await callback.answer(t(lang, "report_expired"), show_alert=True)
        return

    await state.update_data(severity=severity)
    await state.set_state(ReportStates.location)
    await _edit(
        callback,
        t(lang, "report_chosen", category=cat_label(lang, data["category"]), severity=sev_label(lang, severity)),
    )
    await callback.bot.send_message(
        callback.from_user.id,
        t(lang, "report_step_location"),
        reply_markup=kb.location_request(lang),
    )
    await callback.answer()


@router.callback_query(F.data == "rp:skip")
async def on_skip(callback: CallbackQuery, state: FSMContext, bot: Bot, lang: str) -> None:
    """Rasm yoki izoh bosqichini o'tkazib yuborish."""
    current = await state.get_state()
    if current == ReportStates.photo.state:
        await callback.answer()
        await _remove_inline_keyboard(callback)
        await state.set_state(ReportStates.description)
        await bot.send_message(callback.from_user.id, t(lang, "report_step_description"), reply_markup=kb.skip_cancel(lang))
    elif current == ReportStates.description.state:
        await callback.answer()
        await _remove_inline_keyboard(callback)
        await _finish(bot, callback.from_user.id, callback.from_user, state, lang)
    else:
        await callback.answer(t(lang, "report_expired"), show_alert=True)
        await _remove_inline_keyboard(callback)


@router.callback_query(F.data == "rp:cancel")
async def on_cancel(callback: CallbackQuery, state: FSMContext, bot: Bot, lang: str) -> None:
    await state.clear()
    await callback.answer()
    await _edit(callback, t(lang, "report_cancelled"))
    await bot.send_message(callback.from_user.id, t(lang, "menu"), reply_markup=kb.main_menu(lang))


# ---------------------------------------------------------------------------
# 1-2 bosqich: tugma o'rniga boshqa narsa yuborilsa
# ---------------------------------------------------------------------------

@router.message(ReportStates.category)
async def category_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "report_use_buttons"), reply_markup=kb.categories(lang))


@router.message(ReportStates.severity)
async def severity_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "report_use_buttons"), reply_markup=kb.severities(lang))


# ---------------------------------------------------------------------------
# 3-bosqich: joylashuv
# ---------------------------------------------------------------------------

@router.message(ReportStates.location, F.location)
async def on_location(message: Message, state: FSMContext, lang: str) -> None:
    address = None
    if message.venue:
        address = ", ".join(p for p in (message.venue.title, message.venue.address) if p) or None

    await state.update_data(lat=message.location.latitude, lng=message.location.longitude, address=address)
    await state.set_state(ReportStates.photo)
    await message.answer(t(lang, "report_location_ok"), reply_markup=ReplyKeyboardRemove())
    await message.answer(t(lang, "report_step_photo"), reply_markup=kb.skip_cancel(lang))


@router.message(ReportStates.location)
async def location_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "report_location_only"), reply_markup=kb.location_request(lang))


# ---------------------------------------------------------------------------
# 4-bosqich: rasm
# ---------------------------------------------------------------------------

@router.message(ReportStates.photo, F.photo)
async def on_photo(message: Message, state: FSMContext, lang: str) -> None:
    photo = _pick_photo(message.photo)
    await state.update_data(photo_id=photo.file_id)
    await state.set_state(ReportStates.description)
    await message.answer(t(lang, "report_step_description"), reply_markup=kb.skip_cancel(lang))


@router.message(ReportStates.photo)
async def photo_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "report_photo_only"), reply_markup=kb.skip_cancel(lang))


# ---------------------------------------------------------------------------
# 5-bosqich: izoh
# ---------------------------------------------------------------------------

@router.message(ReportStates.description, F.text)
async def on_description(message: Message, state: FSMContext, bot: Bot, lang: str) -> None:
    description = message.text.strip()[:config.DESCRIPTION_MAX]
    await state.update_data(description=description)
    await _finish(bot, message.chat.id, message.from_user, state, lang)


@router.message(ReportStates.description)
async def description_expected(message: Message, lang: str) -> None:
    await message.answer(t(lang, "report_description_only"), reply_markup=kb.skip_cancel(lang))
