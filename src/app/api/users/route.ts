import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, findUserByUsername, id, listAppUsers } from "@/lib/instant/admin";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionCookie(token);
  if (!session || !session.isAdmin) return null;
  return session;
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Permessi insufficienti." }, { status: 403 });
  }

  const users = await listAppUsers();
  return NextResponse.json({
    users: users
      .map(({ id: userId, username, isAdmin, createdAt }) => ({ id: userId, username, isAdmin, createdAt }))
      .sort((a, b) => a.username.localeCompare(b.username))
  });
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Permessi insufficienti." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string; isAdmin?: boolean }
    | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const isAdmin = Boolean(body?.isAdmin);

  if (!username || !password) {
    return NextResponse.json({ error: "Username e password sono obbligatori." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
  }

  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "Username già in uso." }, { status: 409 });
  }

  const newId = id();
  const adminDb = getAdminDb();
  await adminDb.transact([
    adminDb.tx.appUsers[newId].update({
      username,
      passwordHash: hashPassword(password),
      isAdmin,
      createdAt: Date.now()
    })
  ]);

  return NextResponse.json({ user: { id: newId, username, isAdmin } }, { status: 201 });
}
