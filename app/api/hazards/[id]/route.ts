import { getSession, handle, HttpError, requireAdmin } from "@/lib/auth";
import { deleteHazard, getHazard, updateHazard } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";
import { CATEGORIES, SEVERITIES, STATUSES, type Hazard } from "@/lib/types";

/** GET /api/hazards/:id — public, used by the hazard detail page. */
export async function GET(_req: Request, ctx: RouteContext<"/api/hazards/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const hazard = await getHazard(id);
    if (!hazard) throw new HttpError(404, "not_found", "Not found");
    const [dto] = await toDTOs([hazard], (await getSession())?.sub);
    return Response.json({ hazard: dto });
  });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/hazards/[id]">) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Partial<Hazard>;
    const patch: Parameters<typeof updateHazard>[1] = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) throw new HttpError(400, "invalid_status", "Invalid status");
      patch.status = body.status;
    }
    if (body.severity !== undefined) {
      if (!SEVERITIES.includes(body.severity)) throw new HttpError(400, "invalid_severity", "Invalid severity");
      patch.severity = body.severity;
    }
    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) throw new HttpError(400, "invalid_category", "Invalid category");
      patch.category = body.category;
    }
    const hazard = await updateHazard(id, patch);
    if (!hazard) throw new HttpError(404, "not_found", "Not found");
    const [dto] = await toDTOs([hazard], session.sub);
    return Response.json({ hazard: dto });
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/hazards/[id]">) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    if (!(await deleteHazard(id))) throw new HttpError(404, "not_found", "Not found");
    return Response.json({ ok: true });
  });
}
