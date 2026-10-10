# SafeWay — Telegram bot

**SafeWay** — bolalar uchun maktabgacha xavfsiz yo'l. Ota-onalar ko'chadagi xavflar
(ochiq lyuk, yoritilmagan ko'cha, qarovsiz itlar, tez haydovchilar) haqida xabar beradi,
yuqori xavf paydo bo'lsa, yaqin atrofdagi ota-onalarga bot orqali ogohlantirish boradi.

Bot Next.js web sayt (Telegram Mini App) bilan **bitta MongoDB bazani** ishlatadi.

## Imkoniyatlar

| Funksiya | Tavsif |
|---|---|
| `/start` | Foydalanuvchini bazaga yozadi, tilni aniqlaydi, yangi foydalanuvchiga til tanlash tugmalari. `/start hz_<id>` — xavf kartasi |
| 📝 Xabar berish | 5 bosqich: tur → daraja → joylashuv → rasm → izoh |
| 📍 Atrofimda | 500 m ichidagi faol xavflar masofasi bilan + Mini App `/nearby` tugmasi |
| 📊 Statistika | Jami, bartaraf etilgan %, faol yuqori xavflar, tasdiqlar, tur bo'yicha |
| 🆘 Favqulodda | 102, 103, 1050, maktab inspektori |
| ⚙️ Sozlamalar | Xabarnomani yoqish/o'chirish, maktab/uy nuqtasi, til |
| Avtomatik ogohlantirish | Yangi `high` xavf → nuqtasi `NOTIFY_RADIUS` ichidagi va nuqta belgilamagan obunachilarga |
| Moderatsiya | Har yangi xavf `ADMIN_IDS` ga: holatni o'zgartirish va "🗑 Soxta: o'chirish" |
| 👁 +1 | Har karta ostida, bir kishi bir marta (`voters` massivi) |

Til: o'zbek, rus, ingliz (`i18n.py`).

## Fayl tuzilishi

```
bot.py               — kirish nuqtasi (polling, buyruqlar, menyu tugmasi)
config.py            — .env sozlamalari va konstantalar
db.py                — MongoDB (pymongo AsyncMongoClient), indekslar, so'rovlar
i18n.py              — uz/ru/en matnlar, t(lang, key, **vars)
keyboards.py         — reply va inline klaviaturalar
notify.py            — xavf kartasi, moderatorlar va ota-onalarga xabarnoma
middlewares.py       — foydalanuvchi + til, faqat shaxsiy chatlar
states.py            — FSM holatlari
handlers/
  __init__.py        — routerlar tartibi
  actions.py         — menyu tugmalari va buyruqlar (birinchi)
  common.py          — /start, /help, til, statistika, favqulodda, sozlamalar
  report.py          — xabar berish jarayoni
  places.py          — atrofimda, maktab/uy nuqtasi
  hazard_actions.py  — +1, holat, o'chirish
  fallback.py        — tushunilmagan xabarlar (oxirgi)
```

## Baza

Kolleksiyalar web saytdagi Mongoose modellari bilan bir xil:

- **hazards** — `category`, `severity`, `status`, `location` (GeoJSON, 2dsphere), `address`,
  `description`, `hasImage`, `upvotes`, `voters` (`"tg:<id>"`), `reporterTgId`,
  `reporterDevice`, `source: "bot"`, `resolvedAt`, `createdAt`, `updatedAt`, `__v`
- **hazardimages** — `hazardId` (unique), `data` (Binary), `mime: "image/jpeg"`
- **users** — `tgId` (unique), `firstName`, `username`, `lang`, `subscribed`,
  `watchPoint` (2dsphere, sparse), `blocked`, `createdAt`, `updatedAt`

Indekslar bot ishga tushganda yaratiladi; allaqachon bor bo'lsa xato e'tiborsiz qoldiriladi.

> ⚠️ **Baza nomi.** `MONGODB_URI` ichida baza nomi bo'lishi kerak
> (`...mongodb.net/safeway?...`) — web sayt bilan aynan bir xil. Agar URI'da baza nomi
> bo'lmasa, bot ham Mongoose kabi `test` bazasini ishlatadi yoki `MONGODB_DB` bilan
> alohida ko'rsating.

### callback_data formatlari (web sayt ham shularni yuboradi)

```
lang:<uz|ru|en>   rc:<category>   rs:<severity>   rp:skip   rp:cancel
up:<id>           st:<id>:<status>   del:<id>
set:sub           set:loc   set:lang
```

## .env

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `BOT_TOKEN` | ✅ | @BotFather bergan token |
| `MONGODB_URI` | ✅ | Web sayt bilan bir xil MongoDB manzili |
| `APP_URL` | — | Mini App manzili. Faqat `https://` bo'lsa Mini App tugmalari chiqadi |
| `ADMIN_IDS` | — | Moderatorlar Telegram ID'lari, vergul bilan |
| `NOTIFY_RADIUS` | — | Ogohlantirish radiusi, metr (default `2000`) |
| `INSPECTOR_PHONE` | — | Maktab inspektori telefoni |
| `MONGODB_DB` | — | URI'da baza nomi bo'lmasa |

O'z Telegram ID'ingizni bilish uchun [@userinfobot](https://t.me/userinfobot) ga yozing.

## Lokal ishga tushirish

1. **Python 3.11+** o'rnatilganini tekshiring:
   ```bash
   python --version
   ```
2. Virtual muhit yarating va faollashtiring:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS / Linux:
   source .venv/bin/activate
   ```
3. Kutubxonalarni o'rnating:
   ```bash
   pip install -r requirements.txt
   ```
4. `.env.example` dan nusxa olib `.env` yarating va qiymatlarni to'ldiring:
   ```bash
   # Windows:
   copy .env.example .env
   # macOS / Linux:
   cp .env.example .env
   ```
   Haqiqiy token va parollarni faqat `.env` ga yozing — `.env.example` git'ga tushadi.
5. MongoDB Atlas ishlatsangiz: **Network Access** bo'limida kompyuteringiz IP manzilini
   (yoki `0.0.0.0/0`) qo'shing.
6. Botni ishga tushiring:
   ```bash
   python bot.py
   ```
   Logda `MongoDB'ga ulandi` va `Bot ishga tushdi: @...` chiqsa — tayyor. Telegramda botga `/start` yozing.

> Bot polling rejimida ishlaydi va ishga tushganda webhookni o'chiradi.
> Bitta token bilan bir vaqtda faqat **bitta** nusxa ishlashi kerak — lokal botni
> to'xtatmasdan Railway'da ishga tushirsangiz, `Conflict: terminated by other getUpdates` xatosi chiqadi.

## Railway'ga deploy qilish

1. Loyihani GitHub'ga yuklang (`.env` fayli `.gitignore` da — u yuklanmaydi):
   ```bash
   git init
   git add .
   git commit -m "SafeWay bot"
   git branch -M main
   git remote add origin https://github.com/<username>/safeway-bot.git
   git push -u origin main
   ```
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → reponi tanlang.
3. Servis → **Variables** bo'limiga `.env` dagi barcha o'zgaruvchilarni qo'shing
   (`BOT_TOKEN`, `MONGODB_URI`, `APP_URL`, `ADMIN_IDS`, `NOTIFY_RADIUS`, `INSPECTOR_PHONE`).
4. Ishga tushirish buyrug'i `Procfile` dan olinadi: `worker: python bot.py`.
   Agar Railway buni aniqlamasa: **Settings → Deploy → Custom Start Command** ga
   `python bot.py` yozing.
5. Bot HTTP port tinglamaydi — **Settings → Networking** da domen yaratish shart emas.
6. MongoDB Atlas'da **Network Access** ga `0.0.0.0/0` qo'shing (Railway IP manzillari o'zgarib turadi).
7. **Deployments → View Logs** da `Bot ishga tushdi: @...` yozuvini tekshiring.

Har `git push` dan keyin Railway botni avtomatik qayta deploy qiladi.

## Eslatmalar

- **FSM holati xotirada** (`MemoryStorage`) saqlanadi: bot qayta ishga tushsa, yarim qolgan
  "Xabar berish" jarayoni bekor bo'ladi — foydalanuvchi qaytadan boshlaydi.
- **Manzil** joylashuvdan OpenStreetMap Nominatim orqali aniqlanadi; javob bo'lmasa
  koordinatalar yoziladi.
- **Ommaviy ogohlantirish** fonda yuboriladi: har 25 xabardan keyin 1.1 s pauza,
  `RetryAfter` kutiladi, botni bloklaganlar `blocked: true` bo'ladi.
- Moderatsiya xabaridagi `st:`/`del:` tugmalarini faqat `ADMIN_IDS` dagi foydalanuvchilar bosa oladi.
