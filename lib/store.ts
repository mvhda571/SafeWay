import "server-only";
import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { Hazard, TelegramLog, User } from "./types";
import { storage, type DBVersion } from "./storage";

/**
 * Lightweight JSON database so the app runs with zero setup (./data locally, Netlify Blobs on Netlify).
 * Every function here has a 1:1 counterpart in the Prisma/PostGIS schema
 * (see prisma/schema.prisma) — swap this module to move to PostgreSQL.
 */

interface DB {
  users: User[];
  hazards: Hazard[];
  telegram: TelegramLog[];
  /** Generated once; used to sign sessions when AUTH_SECRET is not configured. */
  authSecret?: string;
}

// In-process cache is only safe with a single long-lived server (local fs). Serverless instances
// on Netlify each have their own memory, so there we always read the latest copy.
let cache: DB | null = null;
let queue: Promise<unknown> = Promise.resolve();

function daysAgo(d: number, h = 0) {
  return new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
}

function seed(): DB {
  const now = new Date().toISOString();
  const users: User[] = [
    { id: "u-admin", name: "Super Admin", email: "admin@safeway.uz", passwordHash: bcrypt.hashSync("admin123", 10), role: "super_admin", createdAt: now },
    { id: "u-school", name: "Maktab №110 inspektori", email: "school@safeway.uz", passwordHash: bcrypt.hashSync("school123", 10), role: "school_admin", createdAt: now },
    { id: "u-parent", name: "Dilnoza Karimova", email: "parent@safeway.uz", passwordHash: bcrypt.hashSync("parent123", 10), role: "parent", createdAt: now },
  ];
  type S = [string, string, Hazard["category"], Hazard["severity"], Hazard["status"], number, number, number, number];
  const rows: S[] = [
    ["Ochiq lyuk — Bunyodkor shoh ko'chasi", "Piyodalar yo'lagida qopqog'i yo'q lyuk, kechasi ko'rinmaydi.", "open_manhole", "medium", "active", 41.2856, 69.2041, 1, 7],
    ["Yoritilmagan ko'cha — Qatortol", "Maktabga boradigan yo'lda 300 m davomida chiroqlar yonmaydi.", "unlit_street", "low", "active", 41.2925, 69.2133, 2, 4],
    ["Tezkor haydovchilar — Chilonzor 9-kvartal", "Maktab oldida svetofor yo'q, mashinalar 80+ km/soat tezlikda yuradi.", "speeding", "high", "active", 41.2789, 69.1978, 0, 12],
    ["Qarovsiz itlar — Novza bekati", "Ertalab 5-6 ta it to'dasi bolalarga tashlanmoqda.", "stray_dogs", "medium", "investigating", 41.2903, 69.2245, 3, 9],
    ["Ochiq lyuk — Amir Temur xiyoboni yonida", "Ta'mirlash ishlaridan keyin lyuk ochiq qolgan.", "open_manhole", "high", "active", 41.3115, 69.2795, 0, 15],
    ["Yoritilmagan bog' yo'lagi — Yunusobod 4", "Bog' ichidagi yo'lak butunlay qorong'i.", "unlit_street", "low", "resolved", 41.3652, 69.2867, 9, 3],
    ["Tezkor haydovchilar — Amir Temur shoh ko'chasi", "Piyodalar o'tish joyida mashinalar to'xtamaydi.", "speeding", "high", "investigating", 41.3401, 69.2849, 1, 21],
    ["Qarovsiz itlar — Mirzo Ulug'bek tumani", "Maktab hovlisi atrofida itlar ko'paygan.", "stray_dogs", "medium", "active", 41.3291, 69.3352, 4, 6],
    ["Ochiq lyuk — Sergeli 6", "Ariq ustidagi panjara singan.", "open_manhole", "medium", "resolved", 41.2265, 69.2201, 12, 5],
    ["Yoritilmagan ko'cha — Olmazor", "Maktab ortidagi ko'chada chiroqlar o'g'irlangan.", "unlit_street", "low", "active", 41.3466, 69.2101, 5, 2],
    ["Tezkor haydovchilar — Farg'ona yo'li", "Katta yo'lni kesib o'tishda yer osti o'tish joyi yo'q.", "speeding", "high", "active", 41.2934, 69.3248, 2, 17],
    ["Qarovsiz itlar — Shayxontohur", "Bozor yonida itlar to'dasi.", "stray_dogs", "low", "resolved", 41.3254, 69.2361, 15, 4],
    ["Ochiq lyuk — Yakkasaroy", "Trotuar o'rtasida chuqur, to'siq qo'yilmagan.", "open_manhole", "high", "active", 41.2951, 69.2632, 0, 8],
    ["Yoritilmagan ko'cha — Mirobod", "Temir yo'l ko'prigi ostida yoritish yo'q.", "unlit_street", "medium", "investigating", 41.2988, 69.2885, 6, 5],
  ];
  const hazards: Hazard[] = rows.map(([title, description, category, severity, status, lat, lng, d, votes], i) => ({
    id: `h-${i + 1}`,
    title,
    description,
    category,
    severity,
    status,
    lat,
    lng,
    imageUrl: null,
    confirmations: Array.from({ length: votes }, (_, k) => `seed-${i}-${k}`),
    createdBy: i % 3 === 0 ? "u-school" : "u-parent",
    createdAt: daysAgo(d, i),
    updatedAt: daysAgo(d, i),
  }));
  return { users, hazards, telegram: [], authSecret: randomBytes(32).toString("hex") };
}

/** Reads the DB (seeding it on first use) together with the version tag needed for a safe write. */
async function read(): Promise<{ db: DB; version: DBVersion }> {
  const s = storage();
  if (s.kind === "fs" && cache) return { db: cache, version: { exists: true } };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { text, ...version } = await s.readDB();
    if (text !== null) {
      const db = JSON.parse(text) as DB;
      if (s.kind === "fs") cache = db;
      return { db, version };
    }
    // Empty store: seed it. onlyIfNew means a concurrent seeder wins and we re-read theirs.
    const fresh = seed();
    if (await s.writeDB(JSON.stringify(fresh))) {
      if (s.kind === "fs") cache = fresh;
      continue; // re-read to obtain the ETag
    }
  }
  throw new Error("Could not initialise database");
}

async function load(): Promise<DB> {
  return (await read()).db;
}

/**
 * Applies `fn` to a copy of the DB and saves it. The copy is only adopted after the write succeeds,
 * so a failed write never leaves half-applied changes in memory. On Netlify a concurrent write from
 * another instance makes the conditional write fail, and we retry on the fresh data.
 */
function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { db, version } = await read();
      const draft = structuredClone(db);
      const result = await fn(draft);
      if (await storage().writeDB(JSON.stringify(draft), version)) {
        if (storage().kind === "fs") cache = draft;
        return result;
      }
    }
    throw new Error("Database is busy, please retry");
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function getAuthSecret(): Promise<string> {
  const db = await load();
  if (db.authSecret) return db.authSecret;
  return mutate((d) => (d.authSecret ??= randomBytes(32).toString("hex")));
}

export const putUpload = (name: string, data: ArrayBuffer) => storage().putFile(name, data);
export const getUpload = (name: string) => storage().getFile(name);

// ---------- users ----------
export async function findUserByEmail(email: string) {
  return (await load()).users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  return (await load()).users.find((u) => u.id === id) ?? null;
}

export function createUser(data: Pick<User, "name" | "email" | "passwordHash" | "role">) {
  return mutate((db) => {
    const user: User = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    db.users.push(user);
    return user;
  });
}

// ---------- hazards ----------
export async function listHazards() {
  return [...(await load()).hazards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getHazard(id: string) {
  return (await load()).hazards.find((h) => h.id === id) ?? null;
}

export async function userNames() {
  return new Map((await load()).users.map((u) => [u.id, u.name]));
}

export function createHazard(data: Omit<Hazard, "id" | "createdAt" | "updatedAt" | "confirmations" | "status">) {
  return mutate((db) => {
    const now = new Date().toISOString();
    const hazard: Hazard = { ...data, id: randomUUID(), status: "active", confirmations: [data.createdBy], createdAt: now, updatedAt: now };
    db.hazards.push(hazard);
    return hazard;
  });
}

export function updateHazard(id: string, patch: Partial<Pick<Hazard, "status" | "severity" | "category" | "title" | "description">>) {
  return mutate((db) => {
    const h = db.hazards.find((x) => x.id === id);
    if (!h) return null;
    Object.assign(h, patch, { updatedAt: new Date().toISOString() });
    return h;
  });
}

export function deleteHazard(id: string) {
  return mutate((db) => {
    const before = db.hazards.length;
    db.hazards = db.hazards.filter((h) => h.id !== id);
    return db.hazards.length < before;
  });
}

/** Toggles the user's "+1 I saw it too" vote. */
export function toggleConfirm(id: string, userId: string) {
  return mutate((db) => {
    const h = db.hazards.find((x) => x.id === id);
    if (!h) return null;
    h.confirmations = h.confirmations.includes(userId)
      ? h.confirmations.filter((u) => u !== userId)
      : [...h.confirmations, userId];
    return h;
  });
}

// ---------- telegram log ----------
export async function listTelegram() {
  return [...(await load()).telegram].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
}

export function addTelegram(entry: Omit<TelegramLog, "id" | "createdAt">) {
  return mutate((db) => {
    const log: TelegramLog = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };
    db.telegram.push(log);
    return log;
  });
}
