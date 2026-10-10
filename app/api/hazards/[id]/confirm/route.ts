import { handle, HttpError, requireUser } from "@/lib/auth";
import { addConfirmation } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";

/** POST — "+1 Men ham ko'rdim". One vote per user (checked atomically in the DB); no un-voting. */
export async function POST(_req: Request, ctx: RouteContext<"/api/hazards/[id]/confirm">) {
  return handle(async () => {
    const session = await requireUser();
    const { id } = await ctx.params;
    const { hazard, result } = await addConfirmation(id, session.sub);
    if (!hazard) throw new HttpError(404, "not_found", "Not found");
    const [dto] = await toDTOs([hazard], session.sub);
    if (result === "already") throw new HttpError(409, "already_confirmed", "You already confirmed this hazard", { hazard: dto });
    if (result === "resolved") throw new HttpError(409, "hazard_resolved", "Hazard is already resolved", { hazard: dto });
    return Response.json({ hazard: dto });
  });
}
