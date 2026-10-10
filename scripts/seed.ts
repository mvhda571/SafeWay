/**
 * Seeds MongoDB with demo users and the 14 demo hazards around Tashkent.
 *
 *   npm run seed           # demo users are upserted; hazards are inserted only if the collection is empty
 *   npm run seed -- --reset  # wipes hazards, images and the Telegram log first
 *
 * Reads MONGODB_URI from .env.local (or the environment).
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB, HazardModel, ImageModel, TelegramModel, UserModel } from "../lib/db";
import type { Category, Severity, Status } from "../lib/types";

const reset = process.argv.includes("--reset");

const USERS = [
  { key: "admin", name: "Super Admin", email: "admin@safeway.uz", password: "admin123", role: "super_admin" },
  { key: "school", name: "Maktab №110 inspektori", email: "school@safeway.uz", password: "school123", role: "school_admin" },
  { key: "parent", name: "Dilnoza Karimova", email: "parent@safeway.uz", password: "parent123", role: "parent" },
] as const;

type Row = [string, string, Category, Severity, Status, number, number, number, number, string];
const HAZARDS: Row[] = [
  ["Ochiq lyuk — Bunyodkor shoh ko'chasi", "Piyodalar yo'lagida qopqog'i yo'q lyuk, kechasi ko'rinmaydi.", "open_manhole", "medium", "active", 41.2856, 69.2041, 1, 7, "Bunyodkor shoh ko'chasi, Chilonzor tumani"],
  ["Yoritilmagan ko'cha — Qatortol", "Maktabga boradigan yo'lda 300 m davomida chiroqlar yonmaydi.", "unlit_street", "low", "active", 41.2925, 69.2133, 2, 4, "Qatortol ko'chasi, Chilonzor tumani"],
  ["Tezkor haydovchilar — Chilonzor 9-kvartal", "Maktab oldida svetofor yo'q, mashinalar 80+ km/soat tezlikda yuradi.", "speeding", "high", "active", 41.2789, 69.1978, 0, 12, "Chilonzor 9-kvartal"],
  ["Qarovsiz itlar — Novza bekati", "Ertalab 5-6 ta it to'dasi bolalarga tashlanmoqda.", "stray_dogs", "medium", "investigating", 41.2903, 69.2245, 3, 9, "Novza metro bekati yonida"],
  ["Ochiq lyuk — Amir Temur xiyoboni yonida", "Ta'mirlash ishlaridan keyin lyuk ochiq qolgan.", "open_manhole", "high", "active", 41.3115, 69.2795, 0, 15, "Amir Temur xiyoboni, Yunusobod tumani"],
  ["Yoritilmagan bog' yo'lagi — Yunusobod 4", "Bog' ichidagi yo'lak butunlay qorong'i.", "unlit_street", "low", "resolved", 41.3652, 69.2867, 9, 3, "Yunusobod 4-mavze"],
  ["Tezkor haydovchilar — Amir Temur shoh ko'chasi", "Piyodalar o'tish joyida mashinalar to'xtamaydi.", "speeding", "high", "investigating", 41.3401, 69.2849, 1, 21, "Amir Temur shoh ko'chasi"],
  ["Qarovsiz itlar — Mirzo Ulug'bek tumani", "Maktab hovlisi atrofida itlar ko'paygan.", "stray_dogs", "medium", "active", 41.3291, 69.3352, 4, 6, "Mirzo Ulug'bek tumani"],
  ["Ochiq lyuk — Sergeli 6", "Ariq ustidagi panjara singan.", "open_manhole", "medium", "resolved", 41.2265, 69.2201, 12, 5, "Sergeli 6-mavze"],
  ["Yoritilmagan ko'cha — Olmazor", "Maktab ortidagi ko'chada chiroqlar o'g'irlangan.", "unlit_street", "low", "active", 41.3466, 69.2101, 5, 2, "Olmazor tumani"],
  ["Tezkor haydovchilar — Farg'ona yo'li", "Katta yo'lni kesib o'tishda yer osti o'tish joyi yo'q.", "speeding", "high", "active", 41.2934, 69.3248, 2, 17, "Farg'ona yo'li ko'chasi"],
  ["Qarovsiz itlar — Shayxontohur", "Bozor yonida itlar to'dasi.", "stray_dogs", "low", "resolved", 41.3254, 69.2361, 15, 4, "Shayxontohur tumani"],
  ["Ochiq lyuk — Yakkasaroy", "Trotuar o'rtasida chuqur, to'siq qo'yilmagan.", "open_manhole", "high", "active", 41.2951, 69.2632, 0, 8, "Yakkasaroy tumani"],
  ["Yoritilmagan ko'cha — Mirobod", "Temir yo'l ko'prigi ostida yoritish yo'q.", "unlit_street", "medium", "investigating", 41.2988, 69.2885, 6, 5, "Mirobod tumani"],
];

const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000);

async function main() {
  await connectDB();
  await Promise.all([UserModel.syncIndexes(), HazardModel.syncIndexes()]);

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const doc = await UserModel.findOneAndUpdate(
      { email: u.email },
      { $set: { name: u.name, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) } },
      { upsert: true, new: true },
    );
    ids[u.key] = doc._id.toString();
  }
  console.log(`✔ ${USERS.length} demo users`);

  if (reset) {
    await Promise.all([HazardModel.deleteMany({}), ImageModel.deleteMany({}), TelegramModel.deleteMany({})]);
    console.log("✔ hazards, images and telegram log cleared");
  }
  if ((await HazardModel.estimatedDocumentCount()) > 0) {
    console.log("• hazards collection is not empty — skipped (use --reset to replace)");
  } else {
    // Raw driver insert so our historical createdAt/updatedAt are kept as-is.
    await HazardModel.collection.insertMany(
      HAZARDS.map(([title, description, category, severity, status, lat, lng, d, votes, address], i) => {
        const createdAt = ago(d, i);
        const createdBy = i % 3 === 0 ? ids.school : ids.parent;
        const history = [{ status: "active", at: createdAt }];
        if (status !== "active") history.push({ status: "investigating", at: new Date(createdAt.getTime() + 3600000 * 5) });
        if (status === "resolved") history.push({ status: "resolved", at: new Date(createdAt.getTime() + 86400000 * 2) });
        return {
          title, description, category, severity, status, lat, lng, address,
          location: { type: "Point", coordinates: [lng, lat] },
          imageUrl: null,
          // Seed votes come from placeholder voters; the author is always the first confirmation.
          voters: [createdBy, ...Array.from({ length: votes - 1 }, (_, k) => `seed-${i}-${k}`)],
          upvotes: votes,
          hasImage: false,
          source: "web",
          resolvedAt: status === "resolved" ? new Date(createdAt.getTime() + 86400000 * 2) : null,
          // Demo data must not trigger Telegram broadcasts from the bot.
          botNotifiedAt: createdAt,
          statusHistory: history,
          createdBy,
          createdAt,
          updatedAt: createdAt,
        };
      }),
    );
    console.log(`✔ ${HAZARDS.length} demo hazards`);
  }
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
