import { handle } from "@/lib/auth";
import { removePushSub } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });
    await removePushSub(endpoint);
    return Response.json({ ok: true });
  });
}
