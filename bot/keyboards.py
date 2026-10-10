"""
Klaviaturalar: reply (asosiy menyu, joylashuv so'rash) va inline tugmalar.
callback_data formatlari web sayt bilan bir xil — o'zgartirmang!
"""
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

import config
from i18n import LANG_NAMES, LANGS, cat_label, sev_label, status_label, t


def _webapp_button(text: str, path: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=config.app_url(path)))


# ---------------------------------------------------------------------------
# Reply klaviaturalar
# ---------------------------------------------------------------------------

def main_menu(lang: str) -> ReplyKeyboardMarkup:
    rows: list[list[KeyboardButton]] = []
    if config.WEBAPP_ENABLED:
        rows.append([KeyboardButton(text=t(lang, "btn_map"), web_app=WebAppInfo(url=config.app_url()))])
    rows += [
        [KeyboardButton(text=t(lang, "btn_report")), KeyboardButton(text=t(lang, "btn_nearby"))],
        [KeyboardButton(text=t(lang, "btn_stats")), KeyboardButton(text=t(lang, "btn_sos"))],
        [KeyboardButton(text=t(lang, "btn_settings"))],
    ]
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)


def location_request(lang: str, extra: list[str] | None = None) -> ReplyKeyboardMarkup:
    """Joylashuv so'rash tugmasi + (ixtiyoriy) qo'shimcha tugmalar + bekor qilish."""
    rows = [[KeyboardButton(text=t(lang, "btn_send_location"), request_location=True)]]
    for text in extra or []:
        rows.append([KeyboardButton(text=text)])
    rows.append([KeyboardButton(text=t(lang, "btn_cancel"))])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


# ---------------------------------------------------------------------------
# Til
# ---------------------------------------------------------------------------

def languages() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=LANG_NAMES[code], callback_data=f"lang:{code}") for code in LANGS
    ]])


# ---------------------------------------------------------------------------
# Xabar berish jarayoni
# ---------------------------------------------------------------------------

def _cancel_row(lang: str) -> list[InlineKeyboardButton]:
    return [InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="rp:cancel")]


def categories(lang: str) -> InlineKeyboardMarkup:
    buttons = [
        InlineKeyboardButton(text=cat_label(lang, category), callback_data=f"rc:{category}")
        for category in config.CATEGORIES
    ]
    rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    rows.append(_cancel_row(lang))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def severities(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=sev_label(lang, severity), callback_data=f"rs:{severity}")
            for severity in config.SEVERITIES
        ],
        _cancel_row(lang),
    ])


def skip_cancel(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=t(lang, "btn_skip"), callback_data="rp:skip"),
        InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="rp:cancel"),
    ]])


# ---------------------------------------------------------------------------
# Xavf kartasi va moderatsiya
# ---------------------------------------------------------------------------

def hazard_card(hazard_id: str, lang: str) -> InlineKeyboardMarkup:
    rows = [[InlineKeyboardButton(text=t(lang, "btn_upvote"), callback_data=f"up:{hazard_id}")]]
    if config.WEBAPP_ENABLED:
        rows.append([_webapp_button(t(lang, "btn_open_hazard"), f"/hazard/{hazard_id}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def moderation(hazard_id: str, current_status: str, lang: str) -> InlineKeyboardMarkup:
    def status_button(status: str) -> InlineKeyboardButton:
        mark = "• " if status == current_status else ""
        return InlineKeyboardButton(
            text=f"{mark}{status_label(lang, status)}",
            callback_data=f"st:{hazard_id}:{status}",
        )

    rows = [
        [status_button("active"), status_button("investigating")],
        [status_button("resolved")],
        [InlineKeyboardButton(text=t(lang, "btn_fake_delete"), callback_data=f"del:{hazard_id}")],
    ]
    if config.WEBAPP_ENABLED:
        rows.append([_webapp_button(t(lang, "btn_open_hazard"), f"/hazard/{hazard_id}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------------------------------------------------------------------------
# Mini App havolalari
# ---------------------------------------------------------------------------

def open_map(lang: str) -> InlineKeyboardMarkup | None:
    if not config.WEBAPP_ENABLED:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[_webapp_button(t(lang, "btn_map"), "")]])


def nearby_map(lat: float, lng: float, lang: str) -> InlineKeyboardMarkup | None:
    if not config.WEBAPP_ENABLED:
        return None
    path = f"/nearby?lat={lat:.6f}&lng={lng:.6f}"
    return InlineKeyboardMarkup(inline_keyboard=[[_webapp_button(t(lang, "btn_open_nearby"), path)]])


def stats_map(lang: str) -> InlineKeyboardMarkup | None:
    if not config.WEBAPP_ENABLED:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[_webapp_button(t(lang, "btn_open_stats"), "/stats")]])


# ---------------------------------------------------------------------------
# Sozlamalar
# ---------------------------------------------------------------------------

def settings(user: dict, lang: str) -> InlineKeyboardMarkup:
    subscribed = user.get("subscribed", True) is not False
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t(lang, "btn_sub_on" if subscribed else "btn_sub_off"), callback_data="set:sub")],
        [InlineKeyboardButton(text=t(lang, "btn_set_point"), callback_data="set:loc")],
        [InlineKeyboardButton(text=t(lang, "btn_change_lang"), callback_data="set:lang")],
    ])
