import { getUpload } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const { id } = await ctx.params;
  const img = await getUpload(id).catch(() => null);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
