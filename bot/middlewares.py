"""
Middleware: har xabar va callback'da foydalanuvchini bazadan oladi (yo'q bo'lsa yaratadi)
va handlerga `user`, `lang`, `is_new_user` ni uzatadi. Faqat shaxsiy chatlar o'tkaziladi.
"""
import logging
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.enums import ChatType
from aiogram.types import CallbackQuery, Message, TelegramObject
from pymongo.errors import PyMongoError

import db
from i18n import detect_lang, norm_lang

log = logging.getLogger(__name__)


class UserMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        # --- Faqat shaxsiy chatlar ---
        if isinstance(event, Message):
            if event.chat.type != ChatType.PRIVATE:
                return None
        elif isinstance(event, CallbackQuery):
            # Inline rejimdagi xabarlarda message bo'lmaydi — ularni o'tkazamiz
            if event.message is not None and event.message.chat.type != ChatType.PRIVATE:
                await event.answer()
                return None

        tg_user = getattr(event, "from_user", None)
        if tg_user is None or tg_user.is_bot:
            return None

        # --- Foydalanuvchini bazadan olish ---
        try:
            user, is_new = await db.get_or_create_user(
                tg_user.id, tg_user.first_name, tg_user.username, tg_user.language_code
            )
        except PyMongoError as exc:
            # Baza vaqtincha ishlamasa ham bot javob bersin
            log.error("Foydalanuvchini olishda xato (%s): %s", tg_user.id, exc)
            user = {"tgId": tg_user.id, "lang": detect_lang(tg_user.language_code), "subscribed": True}
            is_new = False

        data["user"] = user
        data["lang"] = norm_lang(user.get("lang"))
        data["is_new_user"] = is_new
        return await handler(event, data)
