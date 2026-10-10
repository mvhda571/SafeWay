import { handle } from "@/lib/auth";
import { listHazards } from "@/lib/store";
import { computeStats } from "@/lib/stats";

/** GET /api/stats — public, read-only dashboard numbers (no moderation data). */
export async function GET() {
  return handle(async () => Response.json(computeStats(await listHazards())));
}
