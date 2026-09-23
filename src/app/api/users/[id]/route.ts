import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, findUserByUsername, getAppUserById, listAppUsers } from "@/lib/instant/admin";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, verifySessionCookie, type SessionPayload } from "@/lib/auth/session";

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
    return NextResponse.json({ error: "Permessi insufficienti." }, { status: 403 });
  }

  const { id: userId } = await params;
  const target = await getAppUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string; isAdmin?: boolean }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Corpo richiesta non valido." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.username !== undefined) {
    const username = body.username.trim();
    if (!username) {
      return NextResponse.json({ error: "Username non valido." }, { status: 400 });
    }
    const existing = await findUserByUsername(username);
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Username già in uso." }, { status: 409 });
    }
    update.username = username;
  }

  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
    }
    update.passwordHash = hashPassword(body.password);
  }

  if (body.isAdmin !== undefined) {
    if (target.isAdmin && !body.isAdmin && (await isLastAdmin(userId))) {
      return NextResponse.json(
        { error: "Non puoi rimuovere i permessi all'unico amministratore rimasto." },
        { status: 400 }
      );
    }
    update.isAdmin = body.isAdmin;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica da applicare." }, { status: 400 });
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
    return NextResponse.json({ error: "Permessi insufficienti." }, { status: 403 });
  }

  const { id: userId } = await params;

  if (userId === session.sub) {
    return NextResponse.json({ error: "Non puoi eliminare il tuo stesso account." }, { status: 400 });
  }

  const target = await getAppUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  if (target.isAdmin && (await isLastAdmin(userId))) {
    return NextResponse.json(
      { error: "Non puoi eliminare l'unico amministratore rimasto." },
      { status: 400 }
    );
  }

  const adminDb = getAdminDb();
  await adminDb.transact([adminDb.tx.appUsers[userId].delete()]);
  return NextResponse.json({ ok: true });
}
