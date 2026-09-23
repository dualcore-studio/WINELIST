import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p);
}

function requiresAdmin(pathname: string): boolean {
  return pathname === "/users" || pathname.startsWith("/users/") || pathname.startsWith("/api/users");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionCookie(token);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (requiresAdmin(pathname) && !session.isAdmin) {
    if (isApi) {
      return NextResponse.json({ error: "Permessi insufficienti." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/wines", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
