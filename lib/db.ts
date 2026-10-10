import mongoose from "mongoose";
import { CATEGORIES, ROLES, SEVERITIES, STATUSES } from "./types";

/**
 * MongoDB (Atlas) connection + Mongoose models.
 *
 * The connection is cached on globalThis so that hot reloads in dev and warm serverless invocations
 * on Netlify reuse one pool instead of opening a new one per request.
 * This file has no "@/..." imports so scripts/seed.ts can load it with plain Node.
 *
 * The Telegram bot (bot/, Python) shares this database. Field names follow the bot:
 *  - hazards: votes in `voters` + `upvotes`; bot reports have only `location` (no lat/lng/title/createdBy);
 *  - bot photos live in `hazardimages` (keyed by hazardId), site photos in `images`;
 *  - the bot's subscribers are in `users` (unique tgId), so site accounts use `webusers`.
 * `botNotifiedAt` is set by the bot once it has alerted subscribers about a site-reported 🔴 hazard.
 */

const g = globalThis as typeof globalThis & {
  _mongo?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};
const cache = (g._mongo ??= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");
  cache.promise ??= mongoose
    .connect(uri, {
      bufferCommands: false,
      // Fail fast enough to stay inside Netlify's 10 s function limit.
      serverSelectionTimeoutMS: 6000,
      maxPoolSize: 5,
    })
    .catch((e) => {
      cache.promise = null;
      throw e;
    });
  cache.conn = await cache.promise;
  return cache.conn;
}

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "parent" },
    lang: { type: String, enum: ["uz", "ru", "en", null], default: null },
    home: { type: { _id: false, lat: Number, lng: Number, label: String }, default: null },
    school: { type: { _id: false, lat: Number, lng: Number, label: String }, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const hazardSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, enum: CATEGORIES, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    status: { type: String, enum: STATUSES, default: "active" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    /** GeoJSON copy of lat/lng for geo queries ([lng, lat]). */
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, default: null },
    imageUrl: { type: String, default: null },
    /** "+1" voters: site user ids or "tg:<telegram id>" for bot users. The author is added on creation. */
    voters: { type: [String], default: [] },
    /** Always voters.length — the bot reads this field. */
    upvotes: { type: Number, default: 0 },
    /** Bot photo stored in `hazardimages`; site photos use imageUrl. */
    hasImage: { type: Boolean, default: false },
    source: { type: String, enum: ["web", "bot"], default: "web" },
    resolvedAt: { type: Date, default: null },
    botNotifiedAt: { type: Date, default: null },
    statusHistory: {
      type: [{ _id: false, status: { type: String, enum: STATUSES }, at: Date }],
      default: [],
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);
hazardSchema.index({ location: "2dsphere" });
hazardSchema.index({ createdAt: -1 });
hazardSchema.index({ createdBy: 1, createdAt: -1 });

const imageSchema = new Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const telegramSchema = new Schema(
  {
    hazardId: { type: String, required: true },
    text: { type: String, required: true },
    delivered: { type: Boolean, default: false },
    error: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Small key/value collection (e.g. the generated session secret). */
const metaSchema = new Schema({ _id: String, value: String });

// "webusers", not "users": the Telegram bot keeps its own subscribers in "users" (unique tgId).
export const UserModel = models.User || model("User", userSchema, "webusers");
export const HazardModel = models.Hazard || model("Hazard", hazardSchema);
export const ImageModel = models.Image || model("Image", imageSchema);
/** Photos sent through the bot: { hazardId, data, mime }. Read-only for the site. */
export const HazardImageModel = models.HazardImage || model("HazardImage", new Schema({}, { strict: false }), "hazardimages");
export const TelegramModel = models.Telegram || model("Telegram", telegramSchema, "telegram");
export const MetaModel = models.Meta || model("Meta", metaSchema, "meta");
