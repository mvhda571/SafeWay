import { handle, requireAdmin } from "@/lib/auth";
import { listHazards, listTelegram } from "@/lib/store";
import { computeStats } from "@/lib/stats";

/** GET /api/admin/stats — public numbers plus the Telegram log (admins only). */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [hazards, telegram] = await Promise.all([listHazards(), listTelegram()]);
    return Response.json({ ...computeStats(hazards), telegram });
  });
}
