import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionCookie(token);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: { id: session.sub, username: session.username, isAdmin: session.isAdmin }
  });
}
