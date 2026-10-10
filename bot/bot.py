"""
SafeWay Telegram boti — kirish nuqtasi.
Ishga tushirish: python bot.py
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    BotCommand,
    BotCommandScopeAllPrivateChats,
    MenuButtonCommands,
    MenuButtonWebApp,
    WebAppInfo,
)

import config
import db
from handlers import setup_routers
from i18n import DEFAULT_LANG, LANGS, t
from middlewares import UserMiddleware

log = logging.getLogger("safeway")

COMMANDS = ("start", "report", "nearby", "stats", "sos", "settings", "help", "cancel")


async def setup_bot_profile(bot: Bot) -> None:
    """Buyruqlar ro'yxati (3 tilda) va Mini App menyu tugmasi."""
    scope = BotCommandScopeAllPrivateChats()
    try:
        for lang in LANGS:
            commands = [BotCommand(command=name, description=t(lang, f"cmd_{name}")) for name in COMMANDS]
            await bot.set_my_commands(commands, scope=scope, language_code=lang)
        # Boshqa tildagi foydalanuvchilar uchun standart ro'yxat
        default = [BotCommand(command=name, description=t(DEFAULT_LANG, f"cmd_{name}")) for name in COMMANDS]
        await bot.set_my_commands(default, scope=scope)

        if config.WEBAPP_ENABLED:
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text=t(DEFAULT_LANG, "menu_button"),
                    web_app=WebAppInfo(url=config.app_url()),
                )
            )
        else:
            await bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    except TelegramAPIError as exc:
        log.warning("Buyruqlar/menyu tugmasi o'rnatilmadi: %s", exc)


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
    )
    config.validate()

    if not config.WEBAPP_ENABLED:
        log.warning("APP_URL https emas yoki ko'rsatilmagan — Mini App tugmalari o'chirilgan")
    if not config.ADMIN_IDS:
        log.warning("ADMIN_IDS ko'rsatilmagan — moderatsiya xabarlari hech kimga bormaydi")

    await db.init_db()

    bot = Bot(
        token=config.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML, link_preview_is_disabled=True),
    )
    dp = Dispatcher(storage=MemoryStorage())

    # Middleware: foydalanuvchi + til, faqat shaxsiy chatlar
    user_middleware = UserMiddleware()
    dp.message.outer_middleware(user_middleware)
    dp.callback_query.outer_middleware(user_middleware)

    dp.include_router(setup_routers())

    # Polling rejimi: avval webhookni o'chiramiz
    await bot.delete_webhook(drop_pending_updates=False)
    await setup_bot_profile(bot)

    me = await bot.get_me()
    log.info("Bot ishga tushdi: @%s", me.username)

    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await bot.session.close()
        await db.close_db()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.getLogger("safeway").info("Bot to'xtatildi")
