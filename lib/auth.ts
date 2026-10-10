import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role, Session, User } from "./types";
import { isAdmin, SESSION_COOKIE } from "./types";
import { getAuthSecret } from "./store";

export { SESSION_COOKIE };
const MAX_AGE = 60 * 60 * 24 * 7;

/** AUTH_SECRET if configured, otherwise a random secret generated once and kept in the database. */
async function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || (await getAuthSecret()));
}

export async function createSession(user: User) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifyToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return {
      sub: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * `code` is stable and machine-readable; the client translates it via the `err.<code>` i18n keys.
 * `message` is an English fallback for API consumers.
 */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string, public extra?: Record<string, unknown>) {
    super(message ?? code);
  }
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new HttpError(401, "unauthorized", "Unauthorized");
  return s;
}

export async function requireAdmin() {
  const s = await requireUser();
  if (!isAdmin(s.role)) throw new HttpError(403, "forbidden", "Forbidden");
  return s;
}

/** Wraps a route handler body, turning HttpError into JSON responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    // Let Next.js internal signals (e.g. prerender bail-out) propagate.
    unstable_rethrow(e);
    if (e instanceof HttpError) return Response.json({ error: e.message, code: e.code, ...e.extra }, { status: e.status });
    console.error(e);
    // Unique index race (e.g. two sign-ups with the same email at once).
    if ((e as { code?: number }).code === 11000) {
      return Response.json({ error: "Already exists", code: "email_taken" }, { status: 409 });
    }
    // Only real connection problems are "database unavailable" — not every Mongo error.
    const db = e instanceof Error &&
      (/^Mongo(ServerSelection|Network|NetworkTimeout)Error$/.test(e.name) || /MONGODB_URI|ECONNREFUSED|querySrv|ENOTFOUND/.test(e.message));
    return Response.json(
      { error: db ? "Database unavailable" : "Internal error", code: db ? "db_unavailable" : "internal" },
      { status: db ? 503 : 500 },
    );
  }
}
