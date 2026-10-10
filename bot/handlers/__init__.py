"""
Routerlarni to'g'ri tartibda ulash:
menyu tugmalari birinchi, tushunilmagan xabarlar eng oxirida.
"""
from aiogram import Router

from . import actions, common, fallback, hazard_actions, places, report


def setup_routers() -> Router:
    root = Router(name="root")
    root.include_routers(
        actions.router,         # 1. menyu tugmalari va buyruqlar (jarayonni bekor qiladi)
        common.router,          # 2. /start, /help, til, sozlamalar
        report.router,          # 3. xabar berish (FSM)
        places.router,          # 4. atrofimda, watchPoint
        hazard_actions.router,  # 5. +1, moderatsiya
        fallback.router,        # 6. tushunilmagan xabarlar — eng oxirida
    )
    return root
