"""
MongoDB bilan ishlash (pymongo async — AsyncMongoClient).
Kolleksiya va maydon nomlari web saytdagi Mongoose modellari bilan bir xil.
"""
import logging
from datetime import datetime, timezone

from bson import Binary, ObjectId
from pymongo import ASCENDING, DESCENDING, GEOSPHERE, AsyncMongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

import config
from i18n import LANGS, detect_lang

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ulanish
# ---------------------------------------------------------------------------

# Baza javob bermasa 30 s emas, 5 s kutib xato beradi — bot "qotib" qolmasin
client: AsyncMongoClient = AsyncMongoClient(
    config.MONGODB_URI or "mongodb://localhost:27017",
    tz_aware=True,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
)

if config.MONGODB_DB:
    database = client[config.MONGODB_DB]
else:
    # URI'dagi baza nomi; bo'lmasa Mongoose kabi "test"
    database = client.get_default_database(default="test")

hazards = database["hazards"]
hazard_images = database["hazardimages"]
users = database["users"]


def now() -> datetime:
    return datetime.now(timezone.utc)


def geo_point(lng: float, lat: float) -> dict:
    """GeoJSON nuqta (MongoDB'da avval longitude, keyin latitude)."""
    return {"type": "Point", "coordinates": [float(lng), float(lat)]}


def parse_object_id(value: str | None) -> ObjectId | None:
    """24 belgili hex satrdan ObjectId; noto'g'ri bo'lsa None."""
    if isinstance(value, str) and len(value) == 24 and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


async def init_db() -> None:
    """Bazaga ulanishni tekshiradi va indekslarni yaratadi."""
    await client.admin.command("ping")
    log.info("MongoDB'ga ulandi: baza '%s'", database.name)

    specs = [
        (hazards, [("location", GEOSPHERE)], {}),
        (hazards, [("createdAt", DESCENDING)], {}),
        (hazards, [("status", ASCENDING)], {}),
        (hazard_images, [("hazardId", ASCENDING)], {"unique": True}),
        (users, [("tgId", ASCENDING)], {"unique": True}),
        (users, [("watchPoint", GEOSPHERE)], {"sparse": True}),
    ]
    for collection, keys, options in specs:
        try:
            await collection.create_index(keys, **options)
        except PyMongoError as exc:
            # Indeks web sayt tomonidan boshqa nom/parametr bilan yaratilgan bo'lishi mumkin — e'tiborsiz
            log.warning("Indeks %s.%s yaratilmadi: %s", collection.name, keys, exc)


async def close_db() -> None:
    await client.close()


# ---------------------------------------------------------------------------
# Foydalanuvchilar
# ---------------------------------------------------------------------------

async def get_user(tg_id: int) -> dict | None:
    return await users.find_one({"tgId": tg_id})


async def get_or_create_user(
    tg_id: int, first_name: str | None, username: str | None, language_code: str | None
) -> tuple[dict, bool]:
    """Foydalanuvchini qaytaradi; yo'q bo'lsa yaratadi. (hujjat, yangimi) juftligi."""
    ts = now()
    doc = await users.find_one({"tgId": tg_id})

    if doc is None:
        doc = {
            "tgId": tg_id,
            "firstName": first_name or "",
            "username": username,
            "lang": detect_lang(language_code),
            "subscribed": True,
            "blocked": False,
            "createdAt": ts,
            "updatedAt": ts,
            "__v": 0,
        }
        try:
            await users.insert_one(doc)
            return doc, True
        except DuplicateKeyError:
            # Parallel so'rov allaqachon yaratib bo'lgan
            doc = await users.find_one({"tgId": tg_id})
            return doc, False

    # Ism/username o'zgargan bo'lsa yoki bot qayta ochilgan bo'lsa — yangilaymiz
    changes: dict = {}
    if doc.get("firstName") != (first_name or ""):
        changes["firstName"] = first_name or ""
    if doc.get("username") != username:
        changes["username"] = username
    if doc.get("blocked"):
        changes["blocked"] = False
    if doc.get("lang") not in LANGS:
        changes["lang"] = detect_lang(language_code)
    if changes:
        changes["updatedAt"] = ts
        await users.update_one({"_id": doc["_id"]}, {"$set": changes})
        doc.update(changes)
    return doc, False


async def set_user_lang(tg_id: int, lang: str) -> None:
    await users.update_one({"tgId": tg_id}, {"$set": {"lang": lang, "updatedAt": now()}})


async def toggle_subscribed(tg_id: int) -> dict | None:
    """Xabarnomani yoqadi/o'chiradi va yangilangan hujjatni qaytaradi."""
    return await users.find_one_and_update(
        {"tgId": tg_id},
        [{"$set": {
            "subscribed": {"$not": [{"$ifNull": ["$subscribed", True]}]},
            "updatedAt": now(),
        }}],
        return_document=ReturnDocument.AFTER,
    )


async def set_watch_point(tg_id: int, lat: float, lng: float) -> None:
    await users.update_one(
        {"tgId": tg_id},
        {"$set": {"watchPoint": geo_point(lng, lat), "updatedAt": now()}},
    )


async def clear_watch_point(tg_id: int) -> None:
    await users.update_one(
        {"tgId": tg_id},
        {"$unset": {"watchPoint": ""}, "$set": {"updatedAt": now()}},
    )


async def mark_blocked(tg_id: int) -> None:
    await users.update_one({"tgId": tg_id}, {"$set": {"blocked": True, "updatedAt": now()}})


def _recipients_query(exclude_tg_id: int | None) -> dict:
    """Xabarnoma oladigan foydalanuvchilar sharti: obuna bo'lgan va botni bloklamagan."""
    query: dict = {"subscribed": {"$ne": False}, "blocked": {"$ne": True}}
    if exclude_tg_id is not None:
        query["tgId"] = {"$ne": exclude_tg_id}
    return query


async def users_near_point(lng: float, lat: float, radius: float, exclude_tg_id: int | None = None) -> list[dict]:
    """watchPoint'i nuqtadan radius ichida bo'lgan obunachilar (masofasi 'dist' maydonida)."""
    pipeline = [
        {"$geoNear": {
            "near": geo_point(lng, lat),
            "key": "watchPoint",
            "distanceField": "dist",
            "maxDistance": radius,
            "spherical": True,
            "query": _recipients_query(exclude_tg_id),
        }},
        {"$project": {"tgId": 1, "lang": 1, "dist": 1}},
    ]
    cursor = await users.aggregate(pipeline)
    return await cursor.to_list(None)


def users_without_point(exclude_tg_id: int | None = None):
    """watchPoint belgilamagan obunachilar (async kursor)."""
    query = _recipients_query(exclude_tg_id)
    query["watchPoint"] = None  # maydon yo'q yoki null
    return users.find(query, {"tgId": 1, "lang": 1})


# ---------------------------------------------------------------------------
# Xavflar
# ---------------------------------------------------------------------------

async def create_hazard(
    *,
    category: str,
    severity: str,
    lat: float,
    lng: float,
    address: str,
    description: str,
    reporter_tg_id: int,
    image: bytes | None = None,
) -> dict:
    """Yangi xavfni (va bo'lsa rasmini) saqlaydi, hujjatni qaytaradi."""
    ts = now()
    doc = {
        "category": category,
        "severity": severity,
        "status": "active",
        "location": geo_point(lng, lat),
        "address": address,
        "description": description,
        "hasImage": bool(image),
        "upvotes": 1,
        "voters": [f"tg:{reporter_tg_id}"],
        "reporterTgId": reporter_tg_id,
        "reporterDevice": None,
        "source": "bot",
        "resolvedAt": None,
        "createdAt": ts,
        "updatedAt": ts,
        "__v": 0,
    }
    await hazards.insert_one(doc)

    if image:
        try:
            await hazard_images.insert_one({
                "hazardId": doc["_id"],
                "data": Binary(image),
                "mime": "image/jpeg",
                "createdAt": ts,
                "updatedAt": ts,
                "__v": 0,
            })
        except PyMongoError as exc:
            log.warning("Rasm saqlanmadi (%s): %s", doc["_id"], exc)
            await hazards.update_one({"_id": doc["_id"]}, {"$set": {"hasImage": False}})
            doc["hasImage"] = False
    return doc


async def get_hazard(hazard_id: ObjectId) -> dict | None:
    return await hazards.find_one({"_id": hazard_id})


async def get_hazard_image(hazard_id: ObjectId) -> bytes | None:
    doc = await hazard_images.find_one({"hazardId": hazard_id})
    if not doc or not doc.get("data"):
        return None
    return bytes(doc["data"])


async def upvote_hazard(hazard_id: ObjectId, voter: str) -> tuple[str, dict | None]:
    """
    "Men ham ko'rdim +1". Natija: ("ok" | "already" | "resolved" | "not_found", hujjat).
    voters massivi orqali bir kishi faqat bir marta ovoz beradi (atomik).
    """
    doc = await hazards.find_one_and_update(
        {"_id": hazard_id, "voters": {"$ne": voter}, "status": {"$ne": "resolved"}},
        {"$addToSet": {"voters": voter}, "$inc": {"upvotes": 1}, "$set": {"updatedAt": now()}},
        return_document=ReturnDocument.AFTER,
    )
    if doc:
        return "ok", doc

    doc = await hazards.find_one({"_id": hazard_id})
    if not doc:
        return "not_found", None
    if doc.get("status") == "resolved":
        return "resolved", doc
    return "already", doc


async def set_hazard_status(hazard_id: ObjectId, status: str) -> dict | None:
    ts = now()
    return await hazards.find_one_and_update(
        {"_id": hazard_id},
        {"$set": {
            "status": status,
            "resolvedAt": ts if status == "resolved" else None,
            "updatedAt": ts,
        }},
        return_document=ReturnDocument.AFTER,
    )


async def delete_hazard(hazard_id: ObjectId) -> dict | None:
    """Xavfni va uning rasmini o'chiradi."""
    doc = await hazards.find_one_and_delete({"_id": hazard_id})
    await hazard_images.delete_many({"hazardId": hazard_id})
    return doc


async def nearby_hazards(lat: float, lng: float, radius: float, limit: int) -> list[dict]:
    """Nuqta atrofidagi faol (resolved bo'lmagan) xavflar, eng yaqini birinchi."""
    pipeline = [
        {"$geoNear": {
            "near": geo_point(lng, lat),
            "key": "location",
            "distanceField": "distance",
            "maxDistance": radius,
            "spherical": True,
            "query": {"status": {"$ne": "resolved"}},
        }},
        {"$limit": limit},
        {"$project": {
            "category": 1, "severity": 1, "status": 1, "address": 1,
            "upvotes": 1, "location": 1, "distance": 1,
        }},
    ]
    cursor = await hazards.aggregate(pipeline)
    return await cursor.to_list(None)


async def get_stats() -> dict:
    """Statistika bitta so'rovda ($facet)."""
    pipeline = [{"$facet": {
        "total": [{"$count": "n"}],
        "resolved": [{"$match": {"status": "resolved"}}, {"$count": "n"}],
        "activeHigh": [
            {"$match": {"severity": "high", "status": {"$ne": "resolved"}}},
            {"$count": "n"},
        ],
        "upvotes": [{"$group": {"_id": None, "n": {"$sum": "$upvotes"}}}],
        "byCategory": [{"$group": {"_id": "$category", "n": {"$sum": 1}}}],
    }}]
    cursor = await hazards.aggregate(pipeline)
    rows = await cursor.to_list(None)
    facet = rows[0] if rows else {}

    def first(name: str) -> int:
        items = facet.get(name) or []
        return int(items[0]["n"]) if items else 0

    return {
        "total": first("total"),
        "resolved": first("resolved"),
        "active_high": first("activeHigh"),
        "upvotes": first("upvotes"),
        "by_category": {row["_id"]: int(row["n"]) for row in facet.get("byCategory") or []},
    }
