import { getSession, handle } from "@/lib/auth";
import { addPushSub } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await getSession();
    const body = await req.json() as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return Response.json({ error: "Invalid subscription" }, { status: 400 });
    }
    await addPushSub({
      userId: session?.sub ?? "anon",
      endpoint: body.endpoint,
      keys: body.keys,
    });
    return Response.json({ ok: true });
  });
}
