import { getSession, handle, HttpError, requireUser } from "@/lib/auth";
import { createHazard, listHazards } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";
import { notifyHighHazard } from "@/lib/telegram";
import { haversine } from "@/lib/geo";
import { CATEGORIES, SEVERITIES, STATUSES, type Category, type Severity, type Status } from "@/lib/types";

/** GET /api/hazards?category=&status=&lat=&lng=&radius= */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") as Category | null;
    const status = url.searchParams.get("status") as Status | null;
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radius = Number(url.searchParams.get("radius") ?? 0);

    let hazards = await listHazards();
    if (category && CATEGORIES.includes(category)) hazards = hazards.filter((h) => h.category === category);
    if (status && STATUSES.includes(status)) hazards = hazards.filter((h) => h.status === status);
    if (radius > 0 && Number.isFinite(lat) && Number.isFinite(lng)) {
      hazards = hazards.filter((h) => haversine([lat, lng], [h.lat, h.lng]) <= radius);
    }
    const session = await getSession();
    return Response.json({ hazards: await toDTOs(hazards, session?.sub) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const body = (await req.json()) as Partial<{
      title: string; description: string; category: Category; severity: Severity;
      lat: number; lng: number; imageUrl: string | null;
    }>;
    const { category, severity, lat, lng } = body;
    if (!category || !CATEGORIES.includes(category)) throw new HttpError(400, "Invalid category");
    if (!severity || !SEVERITIES.includes(severity)) throw new HttpError(400, "Invalid severity");
    if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new HttpError(400, "Invalid coordinates");
    }
    const title = body.title?.trim().slice(0, 120);
    if (!title) throw new HttpError(400, "Title is required");
    const imageUrl = body.imageUrl && body.imageUrl.startsWith("/api/uploads/") ? body.imageUrl : null;

    const hazard = await createHazard({
      title,
      description: (body.description ?? "").trim().slice(0, 1000),
      category,
      severity,
      lat,
      lng,
      imageUrl,
      createdBy: session.sub,
    });
    const telegram = severity === "high" ? await notifyHighHazard(hazard, session.name) : null;
    const [dto] = await toDTOs([hazard], session.sub);
    return Response.json({ hazard: dto, telegram }, { status: 201 });
  });
}
