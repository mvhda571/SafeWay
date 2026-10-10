"""
Sozlamalar: barcha qiymatlar .env faylidan (yoki Railway Variables'dan) o'qiladi.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# .env har doim bot papkasidan o'qiladi (terminal qaysi papkada ochilganidan qat'i nazar)
ENV_FILE = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_FILE)


# ---------------------------------------------------------------------------
# Yordamchi funksiyalar
# ---------------------------------------------------------------------------

def _str(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _int(name: str, default: int) -> int:
    raw = _str(name)
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


def _ids(raw: str) -> frozenset[int]:
    """'123, 456' ko'rinishidagi satrdan Telegram ID'lar to'plamini yasaydi."""
    ids: set[int] = set()
    for part in raw.replace(";", ",").split(","):
        part = part.strip()
        if part.lstrip("-").isdigit():
            ids.add(int(part))
    return frozenset(ids)


# ---------------------------------------------------------------------------
# .env qiymatlari
# ---------------------------------------------------------------------------

BOT_TOKEN = _str("BOT_TOKEN")
MONGODB_URI = _str("MONGODB_URI")
# Ixtiyoriy: URI ichida baza nomi bo'lmasa ishlatiladi.
# Mongoose ham URI'da baza nomi bo'lmasa "test" bazasiga yozadi.
MONGODB_DB = _str("MONGODB_DB")

APP_URL = _str("APP_URL").rstrip("/")
ADMIN_IDS = _ids(_str("ADMIN_IDS"))
NOTIFY_RADIUS = max(100, _int("NOTIFY_RADIUS", 2000))  # metr
INSPECTOR_PHONE = _str("INSPECTOR_PHONE")

# Mini App faqat https manzilda ishlaydi
WEBAPP_ENABLED = APP_URL.startswith("https://")

# ---------------------------------------------------------------------------
# Domen konstantalari (web sayt bilan bir xil)
# ---------------------------------------------------------------------------

CATEGORIES = ("manhole", "dark_street", "stray_dogs", "speeding")
SEVERITIES = ("low", "medium", "high")
STATUSES = ("active", "investigating", "resolved")

NEARBY_RADIUS = 500        # "Atrofimda" qidiruv radiusi, metr
WEB_POLL_INTERVAL = 15     # saytda qo'shilgan 🔴 xavflarni tekshirish oralig'i, soniya
WEB_ALERT_MAX_AGE = 3600   # bundan eski sayt xavflari e'lon qilinmaydi, soniya
NEARBY_LIMIT = 10          # "Atrofimda" ro'yxatidagi eng ko'p xavflar soni
DESCRIPTION_MAX = 500      # izohning eng ko'p uzunligi
PHOTO_MAX_SIDE = 1280      # saqlanadigan rasmning eng katta tomoni, px


def app_url(path: str = "") -> str:
    """Mini App ichidagi sahifa manzili."""
    return f"{APP_URL}{path}"


def validate() -> None:
    """Majburiy o'zgaruvchilar yo'q bo'lsa, botni tushuntirish bilan to'xtatadi."""
    missing = [name for name, value in (("BOT_TOKEN", BOT_TOKEN), ("MONGODB_URI", MONGODB_URI)) if not value]
    if missing:
        where = ENV_FILE if ENV_FILE.exists() else f"{ENV_FILE} (fayl topilmadi!)"
        sys.exit(f"Xato: .env faylida quyidagilar ko'rsatilmagan: {', '.join(missing)}\nTekshirilgan fayl: {where}")
