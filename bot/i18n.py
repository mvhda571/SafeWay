"""
Ko'p tillilik: botdagi barcha matnlar shu faylda (uz / ru / en).
Matnlar HTML formatida, o'zgaruvchilar {nom} ko'rinishida.
"""

LANGS = ("uz", "ru", "en")
DEFAULT_LANG = "uz"

LANG_NAMES = {
    "uz": "🇺🇿 O'zbekcha",
    "ru": "🇷🇺 Русский",
    "en": "🇬🇧 English",
}

CATEGORY_EMOJI = {
    "manhole": "🕳",
    "dark_street": "🌑",
    "stray_dogs": "🐕",
    "speeding": "🚗",
}
SEVERITY_EMOJI = {"low": "🟡", "medium": "🟠", "high": "🔴"}
STATUS_EMOJI = {"active": "⚠️", "investigating": "🔎", "resolved": "✅"}


# ---------------------------------------------------------------------------
# Lug'at
# ---------------------------------------------------------------------------

TEXTS: dict[str, dict[str, str]] = {
    # ======================= O'ZBEKCHA =======================
    "uz": {
        # --- Umumiy ---
        "welcome": (
            "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
            "<b>SafeWay</b> — bolalar uchun maktabgacha xavfsiz yo'l.\n\n"
            "Ko'chadagi xavflar — ochiq lyuk, yoritilmagan ko'cha, qarovsiz itlar, "
            "tez haydovchilar haqida xabar bering. Yuqori xavf paydo bo'lsa, "
            "atrofdagi ota-onalarni darhol ogohlantiramiz.\n\n"
            "Quyidagi menyudan foydalaning 👇"
        ),
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language",
        "lang_changed": "✅ Til o'zgartirildi: O'zbekcha",
        "menu": "🏠 Asosiy menyu 👇",
        "help": (
            "ℹ️ <b>SafeWay — yordam</b>\n\n"
            "📝 <b>Xabar berish</b> — ko'chadagi xavf haqida xabar qoldirish\n"
            "📍 <b>Atrofimda</b> — 500 m radiusdagi faol xavflar\n"
            "📊 <b>Statistika</b> — umumiy ko'rsatkichlar\n"
            "🆘 <b>Favqulodda</b> — muhim telefon raqamlari\n"
            "⚙️ <b>Sozlamalar</b> — xabarnomalar, maktab/uy nuqtasi, til\n\n"
            "❌ Istalgan jarayonni /cancel bilan bekor qilish mumkin."
        ),
        "unknown": "🤔 Tushunmadim. Quyidagi menyudan foydalaning 👇",
        "callback_expired": "Bu tugma eskirgan.",
        "map_unavailable": "🗺 Xarita hozircha mavjud emas.",
        "open_map": "🗺 SafeWay xaritasi:",
        "error": "⚠️ Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",
        "not_set": "ko'rsatilmagan",
        "unknown_author": "noma'lum",
        "menu_button": "🗺 Xarita",

        # --- Tugmalar ---
        "btn_map": "🗺 Xaritani ochish",
        "btn_report": "📝 Xabar berish",
        "btn_nearby": "📍 Atrofimda",
        "btn_stats": "📊 Statistika",
        "btn_sos": "🆘 Favqulodda",
        "btn_settings": "⚙️ Sozlamalar",
        "btn_cancel": "❌ Bekor qilish",
        "btn_skip": "⏭ O'tkazib yuborish",
        "btn_send_location": "📍 Joylashuvni yuborish",
        "btn_remove_point": "🗑 Nuqtani o'chirish",
        "btn_open_hazard": "🗺 Xaritada ochish",
        "btn_open_nearby": "🗺 Xaritada ko'rish",
        "btn_open_stats": "📊 Batafsil statistika",
        "btn_upvote": "👁 Men ham ko'rdim +1",
        "btn_fake_delete": "🗑 Soxta: o'chirish",
        "btn_sub_on": "🔔 Xabarnomalar: yoqilgan",
        "btn_sub_off": "🔕 Xabarnomalar: o'chirilgan",
        "btn_set_point": "📍 Maktab/uy nuqtasini belgilash",
        "btn_change_lang": "🌐 Tilni o'zgartirish",

        # --- Turlar, darajalar, holatlar ---
        "cat_manhole": "Ochiq lyuk",
        "cat_dark_street": "Yoritilmagan ko'cha",
        "cat_stray_dogs": "Qarovsiz itlar",
        "cat_speeding": "Tez haydovchilar",
        "sev_low": "Past",
        "sev_medium": "O'rta",
        "sev_high": "Yuqori",
        "status_active": "Faol",
        "status_investigating": "Tekshirilmoqda",
        "status_resolved": "Bartaraf etildi",

        # --- Xavf kartasi ---
        "card_title": "{sev_emoji} <b>{category}</b> · {severity} daraja",
        "card_status": "📌 Holat: {status}",
        "card_address": "📍 Manzil: {address}",
        "card_description": "📝 Izoh: {description}",
        "card_photo": "📷 Rasm ilova qilingan",
        "card_confirmed": "👁 <b>{count}</b> ota-ona tasdiqladi",
        "card_maps": "🗺 Google Maps'da ochish",

        # --- Xabar berish (FSM) ---
        "report_step_category": "📝 <b>Xabar berish</b> · 1/5\n\nXavf turini tanlang:",
        "report_step_severity": "📝 <b>Xabar berish</b> · 2/5\n\nTur: {category}\n\nXavf darajasini tanlang:",
        "report_chosen": "📝 <b>Xabar berish</b>\n\nTur: {category}\nDaraja: {severity}",
        "report_step_location": (
            "📍 <b>3/5</b> · Xavf joylashgan joyni yuboring.\n\n"
            "Pastdagi «📍 Joylashuvni yuborish» tugmasini bosing yoki "
            "📎 → Joylashuv orqali xaritadan aniq nuqtani tanlang."
        ),
        "report_location_only": "📍 Iltimos, matn emas, joylashuv yuboring — pastdagi tugmani bosing yoki 📎 → Joylashuv.",
        "report_location_ok": "✅ Joylashuv qabul qilindi.",
        "report_step_photo": "📷 <b>4/5</b> · Xavfning rasmini yuboring yoki bu bosqichni o'tkazib yuboring.",
        "report_photo_only": "📷 Iltimos, rasm yuboring (fayl emas, oddiy rasm) yoki «O'tkazib yuborish» tugmasini bosing.",
        "report_step_description": (
            "✍️ <b>5/5</b> · Qisqacha izoh yozing "
            "(masalan: «Maktab darvozasi oldida, 2 kundan beri ochiq») yoki o'tkazib yuboring."
        ),
        "report_description_only": "✍️ Iltimos, izohni matn ko'rinishida yozing yoki «O'tkazib yuborish» tugmasini bosing.",
        "report_use_buttons": "👆 Iltimos, yuqoridagi tugmalardan birini tanlang yoki «❌ Bekor qilish» tugmasini bosing.",
        "report_saving": "⏳ Saqlanmoqda...",
        "report_saved": "✅ Rahmat! Xabaringiz qabul qilindi va xaritaga qo'shildi.",
        "report_saved_high": "🚨 Xavf darajasi yuqori — atrofdagi ota-onalarga ogohlantirish yuborilmoqda.",
        "report_photo_failed": "⚠️ Rasmni yuklab bo'lmadi — xabar rasmsiz saqlanadi.",
        "report_cancelled": "❌ Bekor qilindi.",
        "report_expired": "⌛ Bu jarayon eskirgan. Qaytadan boshlang: «📝 Xabar berish».",
        "report_save_error": "⚠️ Xabarni saqlab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.",

        # --- Atrofimda ---
        "nearby_ask": "📍 Joylashuvingizni yuboring — 500 m radiusdagi faol xavflarni ko'rsataman.",
        "nearby_location_only": "📍 Iltimos, joylashuv yuboring (pastdagi tugma orqali).",
        "nearby_none": "✅ 500 m radiusda faol xavf topilmadi. Baribir ehtiyot bo'ling!",
        "nearby_title": "📍 <b>Atrofingizda {count} ta faol xavf</b> (500 m ichida):",
        "nearby_details": "batafsil",
        "nearby_map_hint": "🗺 Xaritada ko'rish:",

        # --- Statistika ---
        "stats": (
            "📊 <b>SafeWay statistikasi</b>\n\n"
            "📝 Jami xabarlar: <b>{total}</b>\n"
            "✅ Bartaraf etilgan: <b>{resolved}</b> ({percent}%)\n"
            "🔴 Faol yuqori xavflar: <b>{high}</b>\n"
            "👁 Jami tasdiqlar: <b>{upvotes}</b>\n\n"
            "<b>Tur bo'yicha:</b>\n{by_category}"
        ),

        # --- Favqulodda ---
        "sos": (
            "🆘 <b>Favqulodda raqamlar</b>\n\n"
            "👮 Politsiya: <b>102</b>\n"
            "🚑 Tez yordam: <b>103</b>\n"
            "🚒 Favqulodda vaziyatlar (FVV): <b>1050</b>\n"
            "🧑‍🏫 Maktab inspektori: <b>{inspector}</b>\n\n"
            "<i>Bola xavf ostida bo'lsa — darhol qo'ng'iroq qiling!</i>"
        ),

        # --- Sozlamalar ---
        "settings": (
            "⚙️ <b>Sozlamalar</b>\n\n"
            "🔔 Xabarnomalar: {sub}\n"
            "📍 Maktab/uy nuqtasi: {point}\n"
            "🌐 Til: {language}\n\n"
            "<i>Nuqta belgilangan bo'lsa — faqat uning {radius} atrofidagi yuqori xavflar haqida xabar olasiz. "
            "Belgilanmagan bo'lsa — barcha yuqori xavflar haqida.</i>"
        ),
        "on": "✅ yoqilgan",
        "off": "🔕 o'chirilgan",
        "point_set": "✅ belgilangan",
        "point_not_set": "— belgilanmagan",
        "sub_on_alert": "🔔 Xabarnomalar yoqildi",
        "sub_off_alert": "🔕 Xabarnomalar o'chirildi",
        "point_ask": "📍 Maktab yoki uy joylashuvini yuboring.\n\nAniq nuqtani 📎 → Joylashuv orqali xaritadan tanlash mumkin.",
        "point_location_only": "📍 Iltimos, joylashuv yuboring (pastdagi tugma yoki 📎 → Joylashuv orqali).",
        "point_saved": "✅ Nuqta saqlandi. Endi uning {radius} atrofidagi yuqori xavflar haqida xabar olasiz.",
        "point_removed": "🗑 Nuqta o'chirildi. Endi barcha yuqori xavflar haqida xabar olasiz.",

        # --- +1 tasdiq ---
        "upvote_ok": "👍 Rahmat! Tasdiqingiz qabul qilindi.",
        "upvote_already": "Siz bu xavfni allaqachon tasdiqlagansiz.",
        "upvote_resolved": "Bu xavf allaqachon bartaraf etilgan.",
        "hazard_not_found": "Xavf topilmadi — o'chirilgan bo'lishi mumkin.",

        # --- Moderatsiya ---
        "admin_only": "⛔ Faqat moderatorlar uchun.",
        "mod_header": "🛡 <b>Moderatsiya</b>\n👤 Muallif: {author}\n🆔 <code>{id}</code>",
        "mod_status_changed": "✅ Holat o'zgartirildi: {status}",
        "mod_status_same": "Holat allaqachon shunday.",
        "mod_deleted": "🗑 <b>O'chirildi (soxta xabar)</b>\nModerator: {admin}\n🆔 <code>{id}</code>",
        "mod_deleted_alert": "🗑 Xavf o'chirildi.",
        "reporter_status_changed": "🔔 Siz xabar bergan xavf holati o'zgardi: <b>{status}</b>",

        # --- Avtomatik ogohlantirish ---
        "alert_high_near": "🚨 <b>Diqqat! Nuqtangiz yaqinida yuqori xavf</b>\nMasofa: <b>{distance}</b>",
        "alert_high_general": "🚨 <b>Diqqat! Yangi yuqori xavf</b>",

        # --- Birliklar ---
        "unit_m": "{n} m",
        "unit_km": "{n} km",

        # --- Buyruqlar ro'yxati ---
        "cmd_start": "Botni ishga tushirish",
        "cmd_report": "Xavf haqida xabar berish",
        "cmd_nearby": "Atrofimdagi xavflar",
        "cmd_stats": "Statistika",
        "cmd_sos": "Favqulodda raqamlar",
        "cmd_settings": "Sozlamalar",
        "cmd_help": "Yordam",
        "cmd_cancel": "Jarayonni bekor qilish",
    },

    # ======================= РУССКИЙ =======================
    "ru": {
        # --- Общее ---
        "welcome": (
            "Здравствуйте, <b>{name}</b>! 👋\n\n"
            "<b>SafeWay</b> — безопасная дорога детей в школу.\n\n"
            "Сообщайте об опасностях на улице — открытых люках, неосвещённых улицах, "
            "бездомных собаках, лихачах. Если появится высокая опасность, "
            "мы сразу предупредим родителей поблизости.\n\n"
            "Используйте меню ниже 👇"
        ),
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language",
        "lang_changed": "✅ Язык изменён: Русский",
        "menu": "🏠 Главное меню 👇",
        "help": (
            "ℹ️ <b>SafeWay — помощь</b>\n\n"
            "📝 <b>Сообщить</b> — сообщить об опасности на улице\n"
            "📍 <b>Рядом со мной</b> — активные опасности в радиусе 500 м\n"
            "📊 <b>Статистика</b> — общие показатели\n"
            "🆘 <b>Экстренные</b> — важные номера телефонов\n"
            "⚙️ <b>Настройки</b> — уведомления, точка школы/дома, язык\n\n"
            "❌ Любой процесс можно отменить командой /cancel."
        ),
        "unknown": "🤔 Не понял. Пожалуйста, используйте меню ниже 👇",
        "callback_expired": "Эта кнопка устарела.",
        "map_unavailable": "🗺 Карта пока недоступна.",
        "open_map": "🗺 Карта SafeWay:",
        "error": "⚠️ Произошла ошибка. Попробуйте чуть позже.",
        "not_set": "не указан",
        "unknown_author": "неизвестно",
        "menu_button": "🗺 Карта",

        # --- Кнопки ---
        "btn_map": "🗺 Открыть карту",
        "btn_report": "📝 Сообщить",
        "btn_nearby": "📍 Рядом со мной",
        "btn_stats": "📊 Статистика",
        "btn_sos": "🆘 Экстренные",
        "btn_settings": "⚙️ Настройки",
        "btn_cancel": "❌ Отмена",
        "btn_skip": "⏭ Пропустить",
        "btn_send_location": "📍 Отправить геолокацию",
        "btn_remove_point": "🗑 Удалить точку",
        "btn_open_hazard": "🗺 Открыть на карте",
        "btn_open_nearby": "🗺 Смотреть на карте",
        "btn_open_stats": "📊 Подробная статистика",
        "btn_upvote": "👁 Я тоже видел +1",
        "btn_fake_delete": "🗑 Фейк: удалить",
        "btn_sub_on": "🔔 Уведомления: включены",
        "btn_sub_off": "🔕 Уведомления: выключены",
        "btn_set_point": "📍 Указать точку школы/дома",
        "btn_change_lang": "🌐 Сменить язык",

        # --- Типы, уровни, статусы ---
        "cat_manhole": "Открытый люк",
        "cat_dark_street": "Неосвещённая улица",
        "cat_stray_dogs": "Бездомные собаки",
        "cat_speeding": "Лихачи",
        "sev_low": "Низкий",
        "sev_medium": "Средний",
        "sev_high": "Высокий",
        "status_active": "Активна",
        "status_investigating": "Проверяется",
        "status_resolved": "Устранена",

        # --- Карточка опасности ---
        "card_title": "{sev_emoji} <b>{category}</b> · {severity} уровень",
        "card_status": "📌 Статус: {status}",
        "card_address": "📍 Адрес: {address}",
        "card_description": "📝 Описание: {description}",
        "card_photo": "📷 Есть фото",
        "card_confirmed": "👁 Подтвердили родителей: <b>{count}</b>",
        "card_maps": "🗺 Открыть в Google Maps",

        # --- Сообщение (FSM) ---
        "report_step_category": "📝 <b>Новое сообщение</b> · 1/5\n\nВыберите тип опасности:",
        "report_step_severity": "📝 <b>Новое сообщение</b> · 2/5\n\nТип: {category}\n\nВыберите уровень опасности:",
        "report_chosen": "📝 <b>Новое сообщение</b>\n\nТип: {category}\nУровень: {severity}",
        "report_step_location": (
            "📍 <b>3/5</b> · Отправьте место, где находится опасность.\n\n"
            "Нажмите кнопку «📍 Отправить геолокацию» ниже или выберите точку "
            "на карте через 📎 → Геопозиция."
        ),
        "report_location_only": "📍 Пожалуйста, отправьте геолокацию, а не текст — нажмите кнопку ниже или 📎 → Геопозиция.",
        "report_location_ok": "✅ Геолокация принята.",
        "report_step_photo": "📷 <b>4/5</b> · Отправьте фото опасности или пропустите этот шаг.",
        "report_photo_only": "📷 Пожалуйста, отправьте фото (как изображение, не файлом) или нажмите «Пропустить».",
        "report_step_description": (
            "✍️ <b>5/5</b> · Напишите короткое описание "
            "(например: «У ворот школы, открыт уже 2 дня») или пропустите."
        ),
        "report_description_only": "✍️ Пожалуйста, напишите описание текстом или нажмите «Пропустить».",
        "report_use_buttons": "👆 Пожалуйста, выберите вариант кнопками выше или нажмите «❌ Отмена».",
        "report_saving": "⏳ Сохраняем...",
        "report_saved": "✅ Спасибо! Ваше сообщение принято и добавлено на карту.",
        "report_saved_high": "🚨 Высокий уровень — отправляем предупреждение родителям поблизости.",
        "report_photo_failed": "⚠️ Не удалось загрузить фото — сообщение будет сохранено без него.",
        "report_cancelled": "❌ Отменено.",
        "report_expired": "⌛ Этот процесс устарел. Начните заново: «📝 Сообщить».",
        "report_save_error": "⚠️ Не удалось сохранить сообщение. Попробуйте чуть позже.",

        # --- Рядом со мной ---
        "nearby_ask": "📍 Отправьте свою геолокацию — покажу активные опасности в радиусе 500 м.",
        "nearby_location_only": "📍 Пожалуйста, отправьте геолокацию (кнопкой ниже).",
        "nearby_none": "✅ В радиусе 500 м активных опасностей не найдено. И всё же будьте осторожны!",
        "nearby_title": "📍 <b>Активных опасностей рядом: {count}</b> (в радиусе 500 м):",
        "nearby_details": "подробнее",
        "nearby_map_hint": "🗺 Посмотреть на карте:",

        # --- Статистика ---
        "stats": (
            "📊 <b>Статистика SafeWay</b>\n\n"
            "📝 Всего сообщений: <b>{total}</b>\n"
            "✅ Устранено: <b>{resolved}</b> ({percent}%)\n"
            "🔴 Активных высоких опасностей: <b>{high}</b>\n"
            "👁 Всего подтверждений: <b>{upvotes}</b>\n\n"
            "<b>По типам:</b>\n{by_category}"
        ),

        # --- Экстренные ---
        "sos": (
            "🆘 <b>Экстренные номера</b>\n\n"
            "👮 Полиция: <b>102</b>\n"
            "🚑 Скорая помощь: <b>103</b>\n"
            "🚒 МЧС: <b>1050</b>\n"
            "🧑‍🏫 Школьный инспектор: <b>{inspector}</b>\n\n"
            "<i>Если ребёнок в опасности — звоните немедленно!</i>"
        ),

        # --- Настройки ---
        "settings": (
            "⚙️ <b>Настройки</b>\n\n"
            "🔔 Уведомления: {sub}\n"
            "📍 Точка школы/дома: {point}\n"
            "🌐 Язык: {language}\n\n"
            "<i>Если точка указана — вы получаете уведомления только о высоких опасностях "
            "в радиусе {radius} от неё. Если нет — обо всех высоких опасностях.</i>"
        ),
        "on": "✅ включены",
        "off": "🔕 выключены",
        "point_set": "✅ указана",
        "point_not_set": "— не указана",
        "sub_on_alert": "🔔 Уведомления включены",
        "sub_off_alert": "🔕 Уведомления выключены",
        "point_ask": "📍 Отправьте геолокацию школы или дома.\n\nТочную точку можно выбрать на карте через 📎 → Геопозиция.",
        "point_location_only": "📍 Пожалуйста, отправьте геолокацию (кнопкой ниже или через 📎 → Геопозиция).",
        "point_saved": "✅ Точка сохранена. Теперь вы будете получать уведомления о высоких опасностях в радиусе {radius} от неё.",
        "point_removed": "🗑 Точка удалена. Теперь вы будете получать уведомления обо всех высоких опасностях.",

        # --- Подтверждение +1 ---
        "upvote_ok": "👍 Спасибо! Ваше подтверждение принято.",
        "upvote_already": "Вы уже подтвердили эту опасность.",
        "upvote_resolved": "Эта опасность уже устранена.",
        "hazard_not_found": "Опасность не найдена — возможно, она удалена.",

        # --- Модерация ---
        "admin_only": "⛔ Только для модераторов.",
        "mod_header": "🛡 <b>Модерация</b>\n👤 Автор: {author}\n🆔 <code>{id}</code>",
        "mod_status_changed": "✅ Статус изменён: {status}",
        "mod_status_same": "Статус уже такой.",
        "mod_deleted": "🗑 <b>Удалено (фейк)</b>\nМодератор: {admin}\n🆔 <code>{id}</code>",
        "mod_deleted_alert": "🗑 Опасность удалена.",
        "reporter_status_changed": "🔔 Статус опасности, о которой вы сообщили, изменён: <b>{status}</b>",

        # --- Автоматическое предупреждение ---
        "alert_high_near": "🚨 <b>Внимание! Высокая опасность рядом с вашей точкой</b>\nРасстояние: <b>{distance}</b>",
        "alert_high_general": "🚨 <b>Внимание! Новая высокая опасность</b>",

        # --- Единицы ---
        "unit_m": "{n} м",
        "unit_km": "{n} км",

        # --- Список команд ---
        "cmd_start": "Запустить бота",
        "cmd_report": "Сообщить об опасности",
        "cmd_nearby": "Опасности рядом",
        "cmd_stats": "Статистика",
        "cmd_sos": "Экстренные номера",
        "cmd_settings": "Настройки",
        "cmd_help": "Помощь",
        "cmd_cancel": "Отменить процесс",
    },

    # ======================= ENGLISH =======================
    "en": {
        # --- General ---
        "welcome": (
            "Hello, <b>{name}</b>! 👋\n\n"
            "<b>SafeWay</b> — a safe way to school for children.\n\n"
            "Report street hazards — open manholes, unlit streets, stray dogs, "
            "speeding drivers. When a high-risk hazard appears, we instantly "
            "warn parents nearby.\n\n"
            "Use the menu below 👇"
        ),
        "choose_lang": "🌐 Tilni tanlang / Выберите язык / Choose language",
        "lang_changed": "✅ Language changed: English",
        "menu": "🏠 Main menu 👇",
        "help": (
            "ℹ️ <b>SafeWay — help</b>\n\n"
            "📝 <b>Report</b> — report a street hazard\n"
            "📍 <b>Near me</b> — active hazards within 500 m\n"
            "📊 <b>Statistics</b> — overall numbers\n"
            "🆘 <b>Emergency</b> — important phone numbers\n"
            "⚙️ <b>Settings</b> — notifications, school/home point, language\n\n"
            "❌ Any process can be cancelled with /cancel."
        ),
        "unknown": "🤔 I didn't understand that. Please use the menu below 👇",
        "callback_expired": "This button has expired.",
        "map_unavailable": "🗺 The map is not available yet.",
        "open_map": "🗺 SafeWay map:",
        "error": "⚠️ Something went wrong. Please try again a bit later.",
        "not_set": "not set",
        "unknown_author": "unknown",
        "menu_button": "🗺 Map",

        # --- Buttons ---
        "btn_map": "🗺 Open map",
        "btn_report": "📝 Report",
        "btn_nearby": "📍 Near me",
        "btn_stats": "📊 Statistics",
        "btn_sos": "🆘 Emergency",
        "btn_settings": "⚙️ Settings",
        "btn_cancel": "❌ Cancel",
        "btn_skip": "⏭ Skip",
        "btn_send_location": "📍 Send location",
        "btn_remove_point": "🗑 Remove point",
        "btn_open_hazard": "🗺 Open on map",
        "btn_open_nearby": "🗺 View on map",
        "btn_open_stats": "📊 Detailed statistics",
        "btn_upvote": "👁 I saw it too +1",
        "btn_fake_delete": "🗑 Fake: delete",
        "btn_sub_on": "🔔 Notifications: on",
        "btn_sub_off": "🔕 Notifications: off",
        "btn_set_point": "📍 Set school/home point",
        "btn_change_lang": "🌐 Change language",

        # --- Categories, severities, statuses ---
        "cat_manhole": "Open manhole",
        "cat_dark_street": "Unlit street",
        "cat_stray_dogs": "Stray dogs",
        "cat_speeding": "Speeding drivers",
        "sev_low": "Low",
        "sev_medium": "Medium",
        "sev_high": "High",
        "status_active": "Active",
        "status_investigating": "Investigating",
        "status_resolved": "Resolved",

        # --- Hazard card ---
        "card_title": "{sev_emoji} <b>{category}</b> · {severity} severity",
        "card_status": "📌 Status: {status}",
        "card_address": "📍 Address: {address}",
        "card_description": "📝 Note: {description}",
        "card_photo": "📷 Photo attached",
        "card_confirmed": "👁 Confirmed by <b>{count}</b> parents",
        "card_maps": "🗺 Open in Google Maps",

        # --- Report (FSM) ---
        "report_step_category": "📝 <b>New report</b> · 1/5\n\nChoose the hazard type:",
        "report_step_severity": "📝 <b>New report</b> · 2/5\n\nType: {category}\n\nChoose the severity:",
        "report_chosen": "📝 <b>New report</b>\n\nType: {category}\nSeverity: {severity}",
        "report_step_location": (
            "📍 <b>3/5</b> · Send the location of the hazard.\n\n"
            "Tap «📍 Send location» below or pick an exact point on the map "
            "via 📎 → Location."
        ),
        "report_location_only": "📍 Please send a location, not text — tap the button below or 📎 → Location.",
        "report_location_ok": "✅ Location received.",
        "report_step_photo": "📷 <b>4/5</b> · Send a photo of the hazard or skip this step.",
        "report_photo_only": "📷 Please send a photo (as an image, not a file) or tap «Skip».",
        "report_step_description": (
            "✍️ <b>5/5</b> · Write a short note "
            "(e.g. «In front of the school gate, open for 2 days») or skip."
        ),
        "report_description_only": "✍️ Please write the note as text or tap «Skip».",
        "report_use_buttons": "👆 Please choose one of the buttons above or tap «❌ Cancel».",
        "report_saving": "⏳ Saving...",
        "report_saved": "✅ Thank you! Your report was received and added to the map.",
        "report_saved_high": "🚨 High severity — warning parents nearby.",
        "report_photo_failed": "⚠️ Could not download the photo — the report will be saved without it.",
        "report_cancelled": "❌ Cancelled.",
        "report_expired": "⌛ This process has expired. Start again: «📝 Report».",
        "report_save_error": "⚠️ Could not save the report. Please try again a bit later.",

        # --- Near me ---
        "nearby_ask": "📍 Send your location — I'll show active hazards within 500 m.",
        "nearby_location_only": "📍 Please send a location (using the button below).",
        "nearby_none": "✅ No active hazards within 500 m. Stay careful anyway!",
        "nearby_title": "📍 <b>{count} active hazard(s) near you</b> (within 500 m):",
        "nearby_details": "details",
        "nearby_map_hint": "🗺 View on map:",

        # --- Statistics ---
        "stats": (
            "📊 <b>SafeWay statistics</b>\n\n"
            "📝 Total reports: <b>{total}</b>\n"
            "✅ Resolved: <b>{resolved}</b> ({percent}%)\n"
            "🔴 Active high-risk hazards: <b>{high}</b>\n"
            "👁 Total confirmations: <b>{upvotes}</b>\n\n"
            "<b>By type:</b>\n{by_category}"
        ),

        # --- Emergency ---
        "sos": (
            "🆘 <b>Emergency numbers</b>\n\n"
            "👮 Police: <b>102</b>\n"
            "🚑 Ambulance: <b>103</b>\n"
            "🚒 Emergency service: <b>1050</b>\n"
            "🧑‍🏫 School inspector: <b>{inspector}</b>\n\n"
            "<i>If a child is in danger — call immediately!</i>"
        ),

        # --- Settings ---
        "settings": (
            "⚙️ <b>Settings</b>\n\n"
            "🔔 Notifications: {sub}\n"
            "📍 School/home point: {point}\n"
            "🌐 Language: {language}\n\n"
            "<i>If a point is set, you only get alerts about high-risk hazards within {radius} of it. "
            "Otherwise — about all high-risk hazards.</i>"
        ),
        "on": "✅ on",
        "off": "🔕 off",
        "point_set": "✅ set",
        "point_not_set": "— not set",
        "sub_on_alert": "🔔 Notifications enabled",
        "sub_off_alert": "🔕 Notifications disabled",
        "point_ask": "📍 Send the location of the school or home.\n\nYou can pick an exact point on the map via 📎 → Location.",
        "point_location_only": "📍 Please send a location (the button below or 📎 → Location).",
        "point_saved": "✅ Point saved. You'll now get alerts about high-risk hazards within {radius} of it.",
        "point_removed": "🗑 Point removed. You'll now get alerts about all high-risk hazards.",

        # --- +1 confirmation ---
        "upvote_ok": "👍 Thank you! Your confirmation was counted.",
        "upvote_already": "You have already confirmed this hazard.",
        "upvote_resolved": "This hazard has already been resolved.",
        "hazard_not_found": "Hazard not found — it may have been deleted.",

        # --- Moderation ---
        "admin_only": "⛔ Moderators only.",
        "mod_header": "🛡 <b>Moderation</b>\n👤 Author: {author}\n🆔 <code>{id}</code>",
        "mod_status_changed": "✅ Status changed: {status}",
        "mod_status_same": "The status is already set.",
        "mod_deleted": "🗑 <b>Deleted (fake report)</b>\nModerator: {admin}\n🆔 <code>{id}</code>",
        "mod_deleted_alert": "🗑 Hazard deleted.",
        "reporter_status_changed": "🔔 The status of the hazard you reported has changed: <b>{status}</b>",

        # --- Automatic alert ---
        "alert_high_near": "🚨 <b>Attention! High-risk hazard near your point</b>\nDistance: <b>{distance}</b>",
        "alert_high_general": "🚨 <b>Attention! New high-risk hazard</b>",

        # --- Units ---
        "unit_m": "{n} m",
        "unit_km": "{n} km",

        # --- Command list ---
        "cmd_start": "Start the bot",
        "cmd_report": "Report a hazard",
        "cmd_nearby": "Hazards near me",
        "cmd_stats": "Statistics",
        "cmd_sos": "Emergency numbers",
        "cmd_settings": "Settings",
        "cmd_help": "Help",
        "cmd_cancel": "Cancel the current process",
    },
}


# ---------------------------------------------------------------------------
# Funksiyalar
# ---------------------------------------------------------------------------

def norm_lang(lang: str | None) -> str:
    """Noma'lum tilni standart tilga almashtiradi."""
    return lang if lang in TEXTS else DEFAULT_LANG


def t(lang: str | None, key: str, **kwargs) -> str:
    """Kalit bo'yicha tarjima. Kalit topilmasa — standart tildagi matn yoki kalitning o'zi."""
    text = TEXTS[norm_lang(lang)].get(key) or TEXTS[DEFAULT_LANG].get(key) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            return text
    return text


def variants(key: str) -> set[str]:
    """Kalitning barcha tillardagi variantlari (menyu tugmalarini tanish uchun)."""
    return {TEXTS[lang][key] for lang in LANGS if key in TEXTS[lang]}


def detect_lang(language_code: str | None) -> str:
    """Telegram language_code bo'yicha bot tilini aniqlaydi."""
    code = (language_code or "").lower().split("-")[0]
    if code == "uz":
        return "uz"
    if code in ("ru", "be", "uk", "kk", "ky", "tg"):
        return "ru"
    if code == "en":
        return "en"
    return DEFAULT_LANG


def fmt_distance(meters: float, lang: str) -> str:
    """Masofani chiroyli ko'rinishga keltiradi: 350 m / 1.2 km."""
    meters = max(0.0, float(meters or 0))
    if meters < 1000:
        return t(lang, "unit_m", n=int(round(meters)))
    km = f"{meters / 1000:.1f}".rstrip("0").rstrip(".")
    return t(lang, "unit_km", n=km)


def cat_label(lang: str, category: str | None) -> str:
    """Tur nomi emoji bilan: '🕳 Ochiq lyuk'."""
    emoji = CATEGORY_EMOJI.get(category or "", "⚠️")
    return f"{emoji} {t(lang, f'cat_{category}')}"


def sev_label(lang: str, severity: str | None) -> str:
    """Daraja nomi emoji bilan: '🔴 Yuqori'."""
    emoji = SEVERITY_EMOJI.get(severity or "", "⚪")
    return f"{emoji} {t(lang, f'sev_{severity}')}"


def status_label(lang: str, status: str | None) -> str:
    """Holat nomi emoji bilan: '🔎 Tekshirilmoqda'."""
    status = status or "active"
    emoji = STATUS_EMOJI.get(status, "•")
    return f"{emoji} {t(lang, f'status_{status}')}"


def _check_keys() -> None:
    """Uch tildagi kalitlar bir xil ekanini tekshiradi (dasturchi xatosini erta ushlash uchun)."""
    base = set(TEXTS[DEFAULT_LANG])
    for lang in LANGS:
        keys = set(TEXTS[lang])
        if keys != base:
            raise RuntimeError(
                f"i18n: '{lang}' tilida kalitlar mos emas. "
                f"Yetishmaydi: {sorted(base - keys)}, ortiqcha: {sorted(keys - base)}"
            )


_check_keys()
