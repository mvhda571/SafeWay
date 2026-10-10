/**
 * One-off, idempotent migration to the shared site + bot schema (safe to run again).
 *
 *   npm run migrate
 *
 * 1. Site accounts that ended up in `users` (email, no tgId) → `webusers` (same _id, so sessions,
 *    authorship and votes keep working). `users` is the bot's subscriber collection.
 * 2. Bot subscribers from the old default `test` database → `safeway.users` (upsert by tgId).
 * 3. Hazards: `confirmations` → `voters` + `upvotes`; mark existing hazards as already announced so the
 *    bot doesn't broadcast old 🔴 hazards when it starts watching for site reports.
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/db";

async function main() {
  await connectDB();
  const client = mongoose.connection.getClient();
  const db = mongoose.connection.db!;
  if (db.databaseName !== "safeway") throw new Error(`MONGODB_URI points to "${db.databaseName}", expected "safeway"`);

  // 1. site accounts → webusers
  const webusers = db.collection("webusers");
  const stray = await db.collection("users").find({ email: { $exists: true }, tgId: { $exists: false } }).toArray();
  for (const u of stray) {
    if (!(await webusers.findOne({ $or: [{ _id: u._id }, { email: u.email }] }))) await webusers.insertOne(u);
    await db.collection("users").deleteOne({ _id: u._id });
  }
  console.log(`✔ site accounts moved users → webusers: ${stray.length}`);

  // 2. bot subscribers test → safeway
  let copied = 0;
  for (const u of await client.db("test").collection("users").find({ tgId: { $exists: true } }).toArray()) {
    const { _id, ...rest } = u;
    const r = await db.collection("users").updateOne({ tgId: u.tgId }, { $setOnInsert: { _id, ...rest } }, { upsert: true });
    copied += r.upsertedCount;
  }
  console.log(`✔ bot subscribers copied test → safeway: ${copied}`);

  // 3. hazards
  const hazards = db.collection("hazards");
  let votes = 0;
  for (const h of await hazards.find({ confirmations: { $exists: true } }).toArray()) {
    const voters = [...new Set([...(h.voters ?? []), ...(h.confirmations ?? [])])];
    await hazards.updateOne({ _id: h._id }, { $set: { voters, upvotes: voters.length }, $unset: { confirmations: "" } });
    votes++;
  }
  const src = await hazards.updateMany({ source: { $exists: false } }, { $set: { source: "web", hasImage: false } });
  const announced = await hazards.updateMany({ botNotifiedAt: { $exists: false } }, [{ $set: { botNotifiedAt: "$createdAt" } }]);
  console.log(`✔ hazards: votes migrated ${votes}, source set ${src.modifiedCount}, marked announced ${announced.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
