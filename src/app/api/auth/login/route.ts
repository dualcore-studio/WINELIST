import { NextResponse, type NextRequest } from "next/server";
import { findUserByUsername } from "@/lib/instant/admin";
import { verifyPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, createSessionCookie, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Inserisci username e password." }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  const invalid = NextResponse.json({ error: "Credenziali non valide." }, { status: 401 });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return invalid;
  }

  const cookie = createSessionCookie({ id: user.id, username: user.username, isAdmin: user.isAdmin });

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin }
  });
  response.cookies.set(AUTH_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return response;
}
