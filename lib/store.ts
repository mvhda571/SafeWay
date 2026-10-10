import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { Hazard, TelegramLog, User } from "./types";

/**
 * Lightweight JSON-file database so the app runs with zero setup.
 * Every function here has a 1:1 counterpart in the Prisma/PostGIS schema
 * (see prisma/schema.prisma) — swap this module to move to PostgreSQL.
 */

interface DB {
  users: User[];
  hazards: Hazard[];
  telegram: TelegramLog[];
}

const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

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
  return { users, hazards, telegram: [] };
}

async function load(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as DB;
  } catch {
    cache = seed();
    await persist(cache);
  }
  return cache;
}

async function persist(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

/** Serialises writes so concurrent requests can't clobber each other. */
function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

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
