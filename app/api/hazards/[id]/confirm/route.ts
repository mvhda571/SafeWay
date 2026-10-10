import { handle, HttpError, requireUser } from "@/lib/auth";
import { toggleConfirm } from "@/lib/store";
import { toDTOs } from "@/lib/hazards";

export async function POST(_req: Request, ctx: RouteContext<"/api/hazards/[id]/confirm">) {
  return handle(async () => {
    const session = await requireUser();
    const { id } = await ctx.params;
    const hazard = await toggleConfirm(id, session.sub);
    if (!hazard) throw new HttpError(404, "Not found");
    const [dto] = await toDTOs([hazard], session.sub);
    return Response.json({ hazard: dto });
  });
}
