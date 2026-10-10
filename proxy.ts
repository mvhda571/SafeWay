import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";
import { isAdmin, SESSION_COOKIE, type Role } from "@/lib/types";

/**
 * Optimistic guard: non-admins never get the admin shell, guests never get /profile.
 * It only decodes the cookie (the proxy may run on the edge without access to the database
 * that holds the signing secret); every admin API route verifies the signature and role again.
 */
export function proxy(request: NextRequest) {
  let role: Role | undefined;
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const payload = token ? decodeJwt(token) : null;
    if (payload && (payload.exp ?? 0) * 1000 > Date.now()) role = payload.role as Role;
  } catch {}
  const needsAdmin = request.nextUrl.pathname.startsWith("/admin");
  if (needsAdmin ? !isAdmin(role) : !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile"],
};
