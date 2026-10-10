# SafeWay — bolalar uchun xavfsiz yo'l

Ota-onalar va maktablar uchun xavf xaritasi: xavf qo'shish, "+1 Men ham ko'rdim", xavfsiz yo'nalish,
500 m radar, favqulodda raqamlar, moderator paneli va Telegram xabarnomalari. UZ / RU / EN, dark/light.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # MONGODB_URI ni to'ldiring (oxirida /safeway)
npm run seed                 # demo foydalanuvchilar + Toshkent bo'ylab 14 ta demo xavf
npm run dev                  # http://localhost:3000
```

`npm run seed -- --reset` — xavflar, rasmlar va Telegram jurnalini tozalab, demo ma'lumotlarni qayta yozadi.

Demo hisoblar (login sahifasida faqat `DEMO_MODE=true` bo'lsa ko'rinadi):

| Rol | Email | Parol |
|---|---|---|
| Parent | parent@safeway.uz | parent123 |
| School Admin | school@safeway.uz | school123 |
| Super Admin | admin@safeway.uz | admin123 |

## Struktura

```
app/
  page.tsx, landing.tsx          Bosh sahifa (hero, statistika, so'nggi xabarlar)
  map/                           Xarita + filtrlar + "Atrofimdagi xavflar" (500 m, GPS kuzatuvi)
  hazards/[id]/                  Xavf sahifasi: holat kuzatuvi (Mavjud → O'rganilmoqda → Bartaraf etildi)
  route/                         Xavfsiz yo'nalish (Uy → Maktab)
  login/                         Kirish / Ro'yxatdan o'tish
  admin/                         Moderator paneli: KPI, grafiklar, jadval, Telegram log
  api/
    auth/{login,signup,logout,me}
    hazards/            GET (filtr: category, status, lat/lng/radius), POST (6 ta / 10 daqiqa)
    hazards/[id]        GET; PATCH (status/severity/category), DELETE — faqat admin (aks holda 403)
    hazards/[id]/confirm POST — "+1", har foydalanuvchi bir marta (takror → 409)
    upload, uploads/[id]         Rasm MongoDB'da (klientda ≤ 1280 px, ≤ 2 MB)
    route-plan          OSRM + xavf bo'yicha baholash + aylanma yo'l
    geocode             Nominatim manzil qidiruvi (server orqali)
    admin/stats         Dashboard statistikasi
components/                      App shell, bottom nav, SOS panel, report modal, xarita, kartochkalar
lib/
  db.ts        MongoDB ulanishi (global kesh) + Mongoose modellari
  store.ts     Ma'lumotlar qatlami (API javob shakli shu yerda)
  auth.ts      JWT (jose) + httpOnly cookie, rollar
  routing.ts   Xavfsiz yo'nalish algoritmi
  telegram.ts  Telegram xabar shabloni va yuborish
  i18n.ts      UZ / RU / EN lug'atlar
proxy.ts       /admin uchun optimistik himoya (API har so'rovda rolni qayta tekshiradi)
scripts/seed.ts  Demo ma'lumotlar
```

## Xavfsiz yo'nalish qanday ishlaydi

1. OSRM (piyoda profili) dan to'g'ri yo'l va muqobillar olinadi.
2. Har bir yo'l 45 m bufer ichidagi faol xavflar bo'yicha baholanadi: past = 2, o'rta = 10, yuqori = 100.
3. Eng yaxshi yo'l hali ham xavfdan o'tsa, eng xavfli 2 ta nuqtaning ikki yonidan (300 m) aylanma yo'llar sinaladi.
4. Eng kam xavfli yo'l yashil, eng qisqa (lekin xavfliroq) yo'l kulrang punktir; "N ta xavf chetlab o'tildi".
5. Hammasi 7 s ichida tugaydi (Netlify limiti 10 s). Marshrut serveri javob bermasa — 502 va xato xabari.

## Telegram

`BOT_TOKEN` va `TELEGRAM_CHANNEL_ID` (masalan `@safeway_parents` yoki `-100…`) ni kiriting, botni kanalga admin qiling.
Har bir yangi 🔴 yuqori xavf kanalga yuboriladi: tur, manzil, izoh, Google Maps va saytdagi xavf sahifasi havolasi.
Telegram xato bersa ham xavf saqlanadi; natija admin panelidagi jurnalda ko'rinadi. O'zgaruvchilar bo'sh bo'lsa — simulyatsiya.

## Netlify

Site settings → Environment variables: `MONGODB_URI`, `AUTH_SECRET`, `BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`,
`NEXT_PUBLIC_INSPECTOR_PHONE`, `DEMO_MODE`. `NEXT_PUBLIC_*` va `DEMO_MODE` build vaqtida o'qiladi — o'zgartirgandan keyin
qayta deploy qiling. MongoDB Atlas → Network Access: `0.0.0.0/0` (Netlify funksiyalari IP manzili o'zgarib turadi).
Barcha ma'lumotlar (xavflar, ovozlar, statuslar, rasmlar) Atlas'da — qayta deploy yoki funksiya qayta ishga tushishi ularga ta'sir qilmaydi.
