"""
Asosiy menyu tugmalari va buyruqlar. Bu router BIRINCHI ulanadi:
istalgan tildagi menyu tugmasi har qanday holatda ishlaydi va joriy jarayonni bekor qiladi.
"""
from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

import keyboards as kb
from i18n import t, variants

from . import common, places, report

router = Router(name="actions")


@router.message(F.text.in_(variants("btn_cancel")))
@router.message(Command("cancel"))
async def on_cancel(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await message.answer(t(lang, "report_cancelled"), reply_markup=kb.main_menu(lang))


@router.message(F.text.in_(variants("btn_map")))
async def on_map(message: Message, state: FSMContext, lang: str) -> None:
    """Odatda bu tugma Mini App'ni o'zi ochadi; matn kelsa (eski klaviatura) — havola beramiz."""
    await state.clear()
    markup = kb.open_map(lang)
    if markup:
        await message.answer(t(lang, "open_map"), reply_markup=markup)
    else:
        await message.answer(t(lang, "map_unavailable"), reply_markup=kb.main_menu(lang))


@router.message(F.text.in_(variants("btn_report")))
@router.message(Command("report"))
async def on_report(message: Message, state: FSMContext, lang: str) -> None:
    await report.start_report(message, state, lang)


@router.message(F.text.in_(variants("btn_nearby")))
@router.message(Command("nearby"))
async def on_nearby(message: Message, state: FSMContext, lang: str) -> None:
    await places.ask_nearby(message, state, lang)


@router.message(F.text.in_(variants("btn_stats")))
@router.message(Command("stats"))
async def on_stats(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await common.show_stats(message, lang)


@router.message(F.text.in_(variants("btn_sos")))
@router.message(Command("sos"))
async def on_sos(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await common.show_sos(message, lang)


@router.message(F.text.in_(variants("btn_settings")))
@router.message(Command("settings"))
async def on_settings(message: Message, state: FSMContext, user: dict, lang: str) -> None:
    await state.clear()
    await common.show_settings(message, user, lang)
