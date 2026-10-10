import { getUpload } from "@/lib/store";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  // Only names we generated: uuid + known extension (blocks path traversal).
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  const data = await getUpload(file).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: { "Content-Type": MIME[m[1]], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
