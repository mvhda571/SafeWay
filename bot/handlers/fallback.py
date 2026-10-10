"""
Tushunilmagan xabarlar va eskirgan tugmalar. Bu router ENG OXIRIDA ulanadi.
"""
from aiogram import Router
from aiogram.types import CallbackQuery, Message

import keyboards as kb
from i18n import t

router = Router(name="fallback")


@router.message()
async def unknown_message(message: Message, lang: str) -> None:
    await message.answer(t(lang, "unknown"), reply_markup=kb.main_menu(lang))


@router.callback_query()
async def unknown_callback(callback: CallbackQuery, lang: str) -> None:
    await callback.answer(t(lang, "callback_expired"))
