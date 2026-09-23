import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, findUserByUsername, getAppUserById, listAppUsers } from "@/lib/instant/admin";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, verifySessionCookie, type SessionPayload } from "@/lib/auth/session";
import { apiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

function requireAdmin(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionCookie(token);
  if (!session || !session.isAdmin) return null;
  return session;
}

async function isLastAdmin(userId: string): Promise<boolean> {
  const users = await listAppUsers();
  const admins = users.filter((u) => u.isAdmin);
  return admins.length === 1 && admins[0].id === userId;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = requireAdmin(request);
  if (!session) {
    return apiError("forbidden", 403);
  }

  const { id: userId } = await params;
  const target = await getAppUserById(userId);
  if (!target) {
    return apiError("user_not_found", 404);
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string; isAdmin?: boolean }
    | null;
  if (!body) {
    return apiError("invalid_body", 400);
  }

  const update: Record<string, unknown> = {};

  if (body.username !== undefined) {
    const username = body.username.trim();
    if (!username) {
      return apiError("invalid_username", 400);
    }
    const existing = await findUserByUsername(username);
    if (existing && existing.id !== userId) {
      return apiError("username_taken", 409);
    }
    update.username = username;
  }

  if (body.password) {
    if (body.password.length < 8) {
      return apiError("password_too_short", 400);
    }
    update.passwordHash = hashPassword(body.password);
  }

  if (body.isAdmin !== undefined) {
    if (target.isAdmin && !body.isAdmin && (await isLastAdmin(userId))) {
      return apiError("last_admin_demote", 400);
    }
    update.isAdmin = body.isAdmin;
  }

  if (Object.keys(update).length === 0) {
    return apiError("nothing_to_update", 400);
  }

  const adminDb = getAdminDb();
  await adminDb.transact([adminDb.tx.appUsers[userId].update(update)]);

  const updated = await getAppUserById(userId);
  return NextResponse.json({
    user: updated ? { id: updated.id, username: updated.username, isAdmin: updated.isAdmin } : null
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = requireAdmin(request);
  if (!session) {
    return apiError("forbidden", 403);
  }

  const { id: userId } = await params;

  if (userId === session.sub) {
    return apiError("cannot_delete_self", 400);
  }

  const target = await getAppUserById(userId);
  if (!target) {
    return apiError("user_not_found", 404);
  }

  if (target.isAdmin && (await isLastAdmin(userId))) {
    return apiError("last_admin_delete", 400);
  }

  const adminDb = getAdminDb();
  await adminDb.transact([adminDb.tx.appUsers[userId].delete()]);
  return NextResponse.json({ ok: true });
}
