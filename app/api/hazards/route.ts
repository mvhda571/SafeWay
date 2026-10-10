import { getSession, handle, HttpError, requireUser } from "@/lib/auth";
import { countRecentHazards, createHazard, listHazards } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";
import { notifyHighHazard, CATEGORY_UZ } from "@/lib/telegram";
import { reverseGeocode } from "@/lib/geocode";
import { CATEGORIES, SEVERITIES, STATUSES, type Category, type Severity, type Status } from "@/lib/types";

/** Anti-spam: at most RATE_MAX new hazards per user within RATE_WINDOW. */
const RATE_MAX = 6;
const RATE_WINDOW = 10 * 60 * 1000;
const IMAGE_URL = /^\/api\/uploads\/[0-9a-f]{24}$/;

/** GET /api/hazards?category=&status=&lat=&lng=&radius= */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") as Category | null;
    const status = url.searchParams.get("status") as Status | null;
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radius = Number(url.searchParams.get("radius") ?? 0);

    const hazards = await listHazards({
      category: category && CATEGORIES.includes(category) ? category : undefined,
      status: status && STATUSES.includes(status) ? status : undefined,
      near: radius > 0 && Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has("lat") ? { lat, lng, radius } : undefined,
    });
    const session = await getSession();
    return Response.json({ hazards: await toDTOs(hazards, session?.sub) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const body = (await req.json().catch(() => ({}))) as Partial<{
      title: string; description: string; category: Category; severity: Severity;
      lat: number; lng: number; imageUrl: string | null;
    }>;
    const { category, lat, lng } = body;
    // Category and location are the only required fields.
    if (!category || !CATEGORIES.includes(category)) throw new HttpError(400, "invalid_category", "Category is required");
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new HttpError(400, "invalid_coordinates", "Location is required");
    }
    if (body.severity !== undefined && !SEVERITIES.includes(body.severity)) throw new HttpError(400, "invalid_severity", "Invalid severity");
    const severity = body.severity ?? "medium";

    if ((await countRecentHazards(session.sub, RATE_WINDOW)) >= RATE_MAX) {
      throw new HttpError(429, "rate_limited", `At most ${RATE_MAX} reports per 10 minutes`);
    }

    const address = await reverseGeocode(lat, lng);
    const hazard = await createHazard({
      title: body.title?.trim().slice(0, 120) || CATEGORY_UZ[category],
      description: (body.description ?? "").trim().slice(0, 1000),
      category,
      severity,
      lat,
      lng,
      address,
      imageUrl: typeof body.imageUrl === "string" && IMAGE_URL.test(body.imageUrl) ? body.imageUrl : null,
      createdBy: session.sub,
    });

    // The hazard is already saved; a Telegram failure must never fail the request.
    const origin = process.env.SITE_URL || process.env.URL || new URL(req.url).origin;
    const telegram = severity === "high" ? await notifyHighHazard(hazard, session.name, origin).catch(() => null) : null;
    const [dto] = await toDTOs([hazard], session.sub);
    return Response.json({ hazard: dto, telegram }, { status: 201 });
  });
}
