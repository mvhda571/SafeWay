import "server-only";
import { randomBytes } from "crypto";
import { isValidObjectId, Types } from "mongoose";
import type { Category, Hazard, ProfileStats, PushSub, SavedPlace, Status, TelegramLog, User } from "./types";
import { connectDB, HazardImageModel, HazardModel, ImageModel, MetaModel, PushSubModel, TelegramModel, UserModel } from "./db";

/**
 * Data access layer on MongoDB. Every function returns plain objects with string `id`s and ISO dates,
 * so route handlers and the API response shape don't depend on Mongoose.
 */

type Doc = Record<string, unknown> & { _id: { toString(): string } };
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d ?? ""));

function toUser(d: Doc): User {
  return {
    id: d._id.toString(),
    name: d.name as string,
    email: d.email as string,
    passwordHash: d.passwordHash as string,
    role: d.role as User["role"],
    createdAt: iso(d.createdAt),
    lang: (d.lang as User["lang"]) ?? null,
    home: (d.home as SavedPlace | null) ?? null,
    school: (d.school as SavedPlace | null) ?? null,
  };
}

const CATEGORY_TITLE: Record<Category, string> = {
  open_manhole: "Ochiq lyuk",
  unlit_street: "Yoritilmagan ko'cha",
  stray_dogs: "Qarovsiz itlar",
  speeding: "Tezkor haydovchilar",
  no_crossing: "Piyoda o'tish joyi yo'q",
  construction: "Qurilish/chuqur",
  broken_light: "Svetofor ishlamaydi",
  other: "Boshqa xavf",
};

/** Normalises site and bot documents (bot ones only have `location`, `voters`, `hasImage`, `reporterTgId`). */
function toHazard(d: Doc): Hazard {
  const id = d._id.toString();
  const coords = (d.location as { coordinates?: [number, number] } | undefined)?.coordinates;
  return {
    id,
    title: (d.title as string) || CATEGORY_TITLE[d.category as Category] || "SafeWay",
    description: (d.description as string) ?? "",
    category: d.category as Hazard["category"],
    severity: d.severity as Hazard["severity"],
    status: d.status as Status,
    lat: (d.lat as number | undefined) ?? coords?.[1] ?? 0,
    lng: (d.lng as number | undefined) ?? coords?.[0] ?? 0,
    address: (d.address as string | null) ?? null,
    // Bot photos are served by the same route, looked up by hazard id.
    imageUrl: (d.imageUrl as string | null) ?? (d.hasImage ? `/api/uploads/${id}` : null),
    confirmations: (d.voters as string[]) ?? [],
    statusHistory: ((d.statusHistory as { status: Status; at: Date }[]) ?? []).map((s) => ({ status: s.status, at: iso(s.at) })),
    createdBy: (d.createdBy as string | undefined) ?? (d.reporterTgId ? `tg:${d.reporterTgId}` : ""),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

function toTelegram(d: Doc): TelegramLog {
  return {
    id: d._id.toString(),
    hazardId: d.hazardId as string,
    text: d.text as string,
    delivered: !!d.delivered,
    error: (d.error as string | null) ?? null,
    createdAt: iso(d.createdAt),
  };
}

export async function getAuthSecret(): Promise<string> {
  await connectDB();
  // Atomic upsert: concurrent cold starts all end up with the same secret.
  const doc = await MetaModel.findOneAndUpdate(
    { _id: "authSecret" },
    { $setOnInsert: { value: randomBytes(32).toString("hex") } },
    { upsert: true, new: true, lean: true },
  );
  return (doc as unknown as { value: string }).value;
}

// ---------- images (stored in MongoDB) ----------
export async function putUpload(data: Buffer, contentType: string, createdBy: string) {
  await connectDB();
  const doc = await ImageModel.create({ data, contentType, createdBy });
  return doc._id.toString() as string;
}

export async function getUpload(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  type Img = { data: { buffer: ArrayBuffer } | Buffer; contentType?: string; mime?: string };
  // A site upload by image id, otherwise a bot photo by hazard id.
  const doc = ((await ImageModel.findById(id).lean()) ??
    (await HazardImageModel.findOne({ hazardId: new Types.ObjectId(id) }).lean())) as Img | null;
  if (!doc) return null;
  // lean() returns a BSON Binary; normalise to a Node Buffer.
  const data = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from((doc.data as { buffer: ArrayBuffer }).buffer);
  return { data, contentType: doc.contentType ?? doc.mime ?? "image/jpeg" };
}

// ---------- users ----------
export async function findUserByEmail(email: string) {
  await connectDB();
  const d = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
  return d ? toUser(d as Doc) : null;
}

export async function findUserById(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await UserModel.findById(id).lean();
  return d ? toUser(d as Doc) : null;
}

export async function createUser(data: Pick<User, "name" | "email" | "passwordHash" | "role">) {
  await connectDB();
  const d = await UserModel.create(data);
  return toUser(d.toObject() as Doc);
}

export async function updateUserPrefs(id: string, patch: Partial<Pick<User, "lang" | "home" | "school">>) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true, lean: true });
  return d ? toUser(d as Doc) : null;
}

/** Hazards the user reported, plus how many other hazards they confirmed with "+1". */
export async function userActivity(userId: string): Promise<{ stats: ProfileStats; hazards: Hazard[] }> {
  await connectDB();
  const [mine, confirmed] = await Promise.all([
    HazardModel.find({ createdBy: userId }).sort({ createdAt: -1 }).lean(),
    HazardModel.countDocuments({ voters: userId, createdBy: { $ne: userId } }),
  ]);
  const hazards = (mine as Doc[]).map(toHazard);
  return {
    stats: { reported: hazards.length, resolved: hazards.filter((h) => h.status === "resolved").length, confirmed },
    hazards,
  };
}

export async function userNames(ids: string[]) {
  await connectDB();
  const valid = [...new Set(ids)].filter((id) => isValidObjectId(id));
  const users = (await UserModel.find({ _id: { $in: valid } }, { name: 1 }).lean()) as Doc[];
  return new Map(users.map((u) => [u._id.toString(), u.name as string]));
}

// ---------- hazards ----------
export async function listHazards(filter: { category?: string; status?: string; near?: { lat: number; lng: number; radius: number } } = {}) {
  await connectDB();
  const q: Record<string, unknown> = {};
  if (filter.category) q.category = filter.category;
  if (filter.status) q.status = filter.status;
  if (filter.near) {
    q.location = { $geoWithin: { $centerSphere: [[filter.near.lng, filter.near.lat], filter.near.radius / 6378100] } };
  }
  const docs = (await HazardModel.find(q).sort({ createdAt: -1 }).lean()) as Doc[];
  return docs.map(toHazard);
}

export async function getHazard(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const d = await HazardModel.findById(id).lean();
  return d ? toHazard(d as Doc) : null;
}

export async function countRecentHazards(userId: string, sinceMs: number) {
  await connectDB();
  return HazardModel.countDocuments({ createdBy: userId, createdAt: { $gte: new Date(Date.now() - sinceMs) } });
}

export async function createHazard(data: Omit<Hazard, "id" | "createdAt" | "updatedAt" | "confirmations" | "status" | "statusHistory">) {
  await connectDB();
  const d = await HazardModel.create({
    ...data,
    location: { type: "Point", coordinates: [data.lng, data.lat] },
    status: "active",
    voters: [data.createdBy],
    upvotes: 1,
    hasImage: false,
    source: "web",
    statusHistory: [{ status: "active", at: new Date() }],
  });
  return toHazard(d.toObject() as Doc);
}

export async function updateHazard(id: string, patch: Partial<Pick<Hazard, "status" | "severity" | "category" | "title" | "description">>) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  // resolvedAt mirrors what the bot writes when it changes a status.
  const update: Record<string, unknown> = {
    $set: patch.status ? { ...patch, resolvedAt: patch.status === "resolved" ? new Date() : null } : patch,
  };
  if (patch.status) {
    // Only log a history entry when the status actually changes.
    const current = (await HazardModel.findById(id, { status: 1 }).lean()) as { status: Status } | null;
    if (!current) return null;
    if (current.status !== patch.status) update.$push = { statusHistory: { status: patch.status, at: new Date() } };
  }
  const d = await HazardModel.findByIdAndUpdate(id, update, { new: true, lean: true });
  return d ? toHazard(d as Doc) : null;
}

export async function deleteHazard(id: string) {
  if (!isValidObjectId(id)) return false;
  await connectDB();
  const d = (await HazardModel.findByIdAndDelete(id).lean()) as { imageUrl?: string | null } | null;
  if (!d) return false;
  await HazardImageModel.deleteMany({ hazardId: new Types.ObjectId(id) }).catch(() => undefined);
  const imageId = d.imageUrl?.split("/").pop();
  if (imageId && isValidObjectId(imageId)) await ImageModel.deleteOne({ _id: imageId }).catch(() => undefined);
  return true;
}

/**
 * "+1 I saw it too". One vote per user, enforced atomically by the query itself
 * (the update only matches when the user is not yet in `voters` and the hazard isn't resolved).
 */
export async function addConfirmation(id: string, userId: string): Promise<{ hazard: Hazard | null; result: "ok" | "already" | "resolved" | "missing" }> {
  if (!isValidObjectId(id)) return { hazard: null, result: "missing" };
  await connectDB();
  const updated = await HazardModel.findOneAndUpdate(
    { _id: id, status: { $ne: "resolved" }, voters: { $ne: userId } },
    { $addToSet: { voters: userId }, $inc: { upvotes: 1 } },
    { new: true, lean: true },
  );
  if (updated) return { hazard: toHazard(updated as Doc), result: "ok" };
  const h = await getHazard(id);
  if (!h) return { hazard: null, result: "missing" };
  return { hazard: h, result: h.status === "resolved" ? "resolved" : "already" };
}

// ---------- telegram log ----------
export async function listTelegram() {
  await connectDB();
  const docs = (await TelegramModel.find().sort({ createdAt: -1 }).limit(30).lean()) as Doc[];
  return docs.map(toTelegram);
}

export async function addTelegram(entry: Omit<TelegramLog, "id" | "createdAt">) {
  await connectDB();
  const d = await TelegramModel.create(entry);
  return toTelegram(d.toObject() as Doc);
}

// ---------- push subscriptions ----------
export async function listPushSubs(): Promise<PushSub[]> {
  await connectDB();
  const docs = (await PushSubModel.find().lean()) as Doc[];
  return docs.map((d) => ({
    id: d._id.toString(),
    userId: d.userId as string,
    endpoint: d.endpoint as string,
    keys: d.keys as { p256dh: string; auth: string },
    createdAt: iso(d.createdAt),
  }));
}

export async function addPushSub(entry: Omit<PushSub, "id" | "createdAt">) {
  await connectDB();
  const d = await PushSubModel.findOneAndUpdate(
    { endpoint: entry.endpoint },
    { $set: { userId: entry.userId, keys: entry.keys } },
    { upsert: true, new: true, lean: true },
  ) as Doc;
  return {
    id: d._id.toString(),
    userId: entry.userId,
    endpoint: entry.endpoint,
    keys: entry.keys,
    createdAt: iso(d.createdAt),
  };
}

export async function removePushSub(endpoint: string) {
  await connectDB();
  const r = await PushSubModel.deleteOne({ endpoint });
  return r.deletedCount > 0;
}
