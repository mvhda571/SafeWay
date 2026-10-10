import bcrypt from "bcryptjs";
import { createSession, handle, HttpError } from "@/lib/auth";
import { findUserByEmail } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) throw new HttpError(400, "missing_credentials", "Email and password are required");
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "bad_credentials", "Invalid email or password");
    }
    await createSession(user);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, lang: user.lang ?? null });
  });
}
