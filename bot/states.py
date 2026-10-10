"""
FSM holatlari.
"""
from aiogram.fsm.state import State, StatesGroup


class ReportStates(StatesGroup):
    """Xabar berish — 5 bosqich."""
    category = State()
    severity = State()
    location = State()
    photo = State()
    description = State()


class NearbyStates(StatesGroup):
    """"Atrofimda" — joylashuv kutilmoqda."""
    waiting_location = State()


class SettingsStates(StatesGroup):
    """Maktab/uy nuqtasini belgilash — joylashuv kutilmoqda."""
    waiting_watch_point = State()
