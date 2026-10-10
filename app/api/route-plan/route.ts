import { handle, HttpError } from "@/lib/auth";
import { listHazards } from "@/lib/store";
import { findSafeRoute } from "@/lib/routing";
import type { LatLng } from "@/lib/geo";

function parse(v: string | null): LatLng | null {
  const [lat, lng] = (v ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

/** GET /api/route-plan?from=lat,lng&to=lat,lng */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const from = parse(url.searchParams.get("from"));
    const to = parse(url.searchParams.get("to"));
    if (!from || !to) throw new HttpError(400, "from and to are required as lat,lng");
    return Response.json(await findSafeRoute(from, to, await listHazards()));
  });
}
