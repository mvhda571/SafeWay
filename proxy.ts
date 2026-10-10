import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { isAdmin } from "@/lib/types";

/** Optimistic guard: non-admins never get the admin shell. The API re-checks every request. */
export async function proxy(request: NextRequest) {
  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin(session?.role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
