import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/sorteio/:path*", "/login"],
};
