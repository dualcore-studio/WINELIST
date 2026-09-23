import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "wl_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 giorni

export type SessionPayload = {
  sub: string;
  username: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Imposta AUTH_SECRET in .env.local (stringa random lunga, es. crypto.randomBytes(32).toString('hex'))."
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionCookie(user: { id: string; username: string; isAdmin: boolean }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS
  };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionCookie(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
