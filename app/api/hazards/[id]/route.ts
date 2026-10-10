import { handle, HttpError, requireAdmin } from "@/lib/auth";
import { deleteHazard, updateHazard } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";
import { CATEGORIES, SEVERITIES, STATUSES, type Hazard } from "@/lib/types";

export async function PATCH(req: Request, ctx: RouteContext<"/api/hazards/[id]">) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json()) as Partial<Hazard>;
    const patch: Parameters<typeof updateHazard>[1] = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) throw new HttpError(400, "Invalid status");
      patch.status = body.status;
    }
    if (body.severity !== undefined) {
      if (!SEVERITIES.includes(body.severity)) throw new HttpError(400, "Invalid severity");
      patch.severity = body.severity;
    }
    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) throw new HttpError(400, "Invalid category");
      patch.category = body.category;
    }
    const hazard = await updateHazard(id, patch);
    if (!hazard) throw new HttpError(404, "Not found");
    const [dto] = await toDTOs([hazard], session.sub);
    return Response.json({ hazard: dto });
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/hazards/[id]">) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    if (!(await deleteHazard(id))) throw new HttpError(404, "Not found");
    return Response.json({ ok: true });
  });
}
