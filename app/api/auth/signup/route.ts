import bcrypt from "bcryptjs";
import { createSession, handle, HttpError } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const { name, email, password } = (await req.json()) as { name?: string; email?: string; password?: string };
    const cleanEmail = email?.trim() ?? "";
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new HttpError(400, "Name and a valid email are required");
    if (!password || password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
    if (await findUserByEmail(cleanEmail)) throw new HttpError(409, "Email already registered");
    // Self-signup always creates a Parent; admins are promoted by a Super Admin.
    const user = await createUser({
      name: name.trim().slice(0, 80),
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: "parent",
    });
    await createSession(user);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  });
}
