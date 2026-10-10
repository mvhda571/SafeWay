import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  return Response.json({ user: s ? { id: s.sub, name: s.name, email: s.email, role: s.role } : null });
}
