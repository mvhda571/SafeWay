# SafeWay — bolalar uchun xavfsiz yo'l

Ota-onalar va maktablar uchun xavf xaritasi: xavf qo'shish, "+1 Men ham ko'rdim", xavfsiz yo'nalish,
500 m radar, favqulodda raqamlar, moderator paneli va Telegram xabarnomalari. UZ / RU / EN, dark/light.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # ixtiyoriy: Telegram va AUTH_SECRET
npm run dev                  # http://localhost:3000
```

Birinchi so'rovda `data/db.json` demo ma'lumotlar (Toshkent bo'ylab 14 ta xavf) bilan avtomatik yaratiladi.
Qayta boshlash uchun `data/` papkasini o'chiring.

| Rol | Email | Parol |
|---|---|---|
| Parent | parent@safeway.uz | parent123 |
| School Admin | school@safeway.uz | school123 |
| Super Admin | admin@safeway.uz | admin123 |

## Struktura

```
app/
  page.tsx, landing.tsx          Bosh sahifa (hero, statistika, so'nggi xabarlar)
  map/                           Xarita + filtrlar + "Atrofimdagi xavflar" (500 m)
  route/                         Xavfsiz yo'nalish (Uy → Maktab)
  login/                         Kirish / Ro'yxatdan o'tish
  admin/                         Moderator paneli: KPI, grafiklar, jadval, Telegram log
  api/
    auth/{login,signup,logout,me}
    hazards/            GET (filtr: category, status, lat/lng/radius), POST
    hazards/[id]        PATCH (status/severity/category), DELETE   — faqat admin
    hazards/[id]/confirm POST — +1 ovozni yoqish/o'chirish
    upload, uploads/[file]       Rasm yuklash (JPG/PNG/WEBP, ≤ 4.5 MB)
    route-plan          OSRM + xavf bo'yicha baholash + aylanma yo'l
    geocode             Nominatim manzil qidiruvi (server orqali)
    admin/stats         Dashboard statistikasi
components/                      App shell, bottom nav, SOS panel, report modal, xarita, kartochkalar
lib/
  store.ts     JSON fayl bazasi (Prisma modellari bilan 1:1)
  auth.ts      JWT (jose) + httpOnly cookie, rollar
  routing.ts   Xavfsiz yo'nalish algoritmi
  telegram.ts  Telegram xabar shabloni va yuborish
  i18n.ts      UZ / RU / EN lug'atlar
proxy.ts       /admin uchun optimistik himoya (API har so'rovda rolni qayta tekshiradi)
prisma/        PostgreSQL + PostGIS sxemasi va ST_DWithin indeks/trigger
```

## Xavfsiz yo'nalish qanday ishlaydi

1. OSRM (piyoda profili) dan to'g'ri yo'l va muqobillar olinadi.
2. Har bir yo'l 60 m bufer ichidagi faol xavflar bo'yicha baholanadi: past = 2, o'rta = 10, yuqori = 100.
3. Eng yaxshi yo'l hali ham qizil xavfdan o'tsa, xavf atrofida 250/450 m uzoqlikdagi oraliq nuqtalar
   orqali aylanma yo'llar sinab ko'riladi (to'g'ri yo'ldan 2.2 baravardan uzun bo'lmagan).
4. Eng past xavfli (teng bo'lsa — eng qisqa) yo'l yashil chiziq bilan chiziladi.

Marshrut serveri javob bermasa, to'g'ri chiziq va ogohlantirish ko'rsatiladi.

## Telegram

`.env.local` da `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` ni to'ldiring — yangi 🔴 yuqori xavf guruhga
yuboriladi. Bo'sh qolsa, simulyatsiya rejimi: xabar admin panelida va xavf qo'shilgandan keyin preview
sifatida ko'rinadi.

## Netlify

Hech narsa sozlash shart emas: Netlify'da ma'lumotlar va rasmlar avtomatik ravishda **Netlify Blobs**
(`safeway` store) da saqlanadi, chunki serverless funksiyalarda fayl tizimi faqat o'qish uchun.
Lokal ishga tushirganda esa `./data` ishlatiladi ([lib/storage.ts](lib/storage.ts)).

`AUTH_SECRET` ixtiyoriy — berilmasa, tasodifiy kalit bir marta yaratilib, ma'lumotlar bilan saqlanadi.
Telegram uchun: Site settings → Environment variables → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Production'ga o'tish

- **Baza:** `prisma/schema.prisma` + `prisma/postgis.sql` ni qo'llang va `lib/store.ts` funksiyalarini
  Prisma chaqiruvlari bilan almashtiring (imzolar o'zgarmaydi). Radius so'rovi uchun `ST_DWithin` misoli SQL faylda.
- **Rasmlar:** `app/api/upload/route.ts` ni Supabase Storage yoki Cloudinary'ga yo'naltiring.
- **Google login:** tugma tayyor; NextAuth/Supabase Google provider'ni ulang.
- **OSRM / Nominatim:** ochiq demo serverlar — katta trafik uchun o'z serveringizni ko'taring.
