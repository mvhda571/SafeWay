import { handle, HttpError, requireUser } from "@/lib/auth";
import { findUserById, updateUserPrefs, userActivity } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";
import { LOCALES } from "@/lib/i18n";
import type { SavedPlace, User } from "@/lib/types";

function publicUser(u: User) {
  const { passwordHash, ...rest } = u;
  void passwordHash; // never sent to the client
  return rest;
}

/** GET /api/me — the signed-in user's own profile, stats and reports. */
export async function GET() {
  return handle(async () => {
    const session = await requireUser();
    const user = await findUserById(session.sub);
    if (!user) throw new HttpError(401, "unauthorized", "Account not found");
    const { stats, hazards } = await userActivity(user.id);
    return Response.json({ user: publicUser(user), stats, hazards: await toDTOs(hazards, user.id) });
  });
}

function place(v: unknown): SavedPlace | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const p = v as Partial<SavedPlace>;
  if (typeof p.lat !== "number" || typeof p.lng !== "number" || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
    throw new HttpError(400, "invalid_coordinates", "Invalid place");
  }
  return { lat: p.lat, lng: p.lng, label: String(p.label ?? "").slice(0, 200) };
}

/** PATCH /api/me — { lang?, home?, school? }. Only the session's own document is updated. */
export async function PATCH(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<Pick<User, "lang" | "home" | "school">> = {};
    if (body.lang !== undefined) {
      if (!LOCALES.includes(body.lang as never)) throw new HttpError(400, "invalid_lang", "Invalid language");
      patch.lang = body.lang as User["lang"];
    }
    const home = place(body.home);
    const school = place(body.school);
    if (home !== undefined) patch.home = home;
    if (school !== undefined) patch.school = school;
    const user = await updateUserPrefs(session.sub, patch);
    if (!user) throw new HttpError(401, "unauthorized", "Account not found");
    return Response.json({ user: publicUser(user) });
  });
}
