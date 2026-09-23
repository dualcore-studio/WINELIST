import { id, init } from "@instantdb/admin";

/**
 * Client InstantDB con privilegi admin, usato SOLO da Route Handler/script server-side
 * per la collection `appUsers` (contiene passwordHash). Non importare mai da componenti
 * "use client": va bypassato ogni permission check lato client apposta per questo.
 */

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "";
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN ?? "";

if (!appId || appId === "replace_with_your_instant_app_id") {
  throw new Error("Imposta NEXT_PUBLIC_INSTANT_APP_ID in .env.local.");
}
if (!adminToken) {
  throw new Error("Imposta INSTANT_APP_ADMIN_TOKEN in .env.local (Instant Dashboard → Admin).");
}

export const adminDb = init({ appId, adminToken });
export { id };

export type AppUserRow = {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: number;
};

function normalizeRows(raw: unknown): AppUserRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as AppUserRow[];
  return Object.values(raw as Record<string, AppUserRow>);
}

export async function listAppUsers(): Promise<AppUserRow[]> {
  const result = await adminDb.query({ appUsers: {} });
  return normalizeRows((result as { appUsers?: unknown }).appUsers);
}

export async function findUserByUsername(username: string): Promise<AppUserRow | null> {
  const needle = username.trim().toLowerCase();
  const users = await listAppUsers();
  return users.find((u) => u.username.toLowerCase() === needle) ?? null;
}

export async function getAppUserById(userId: string): Promise<AppUserRow | null> {
  const users = await listAppUsers();
  return users.find((u) => u.id === userId) ?? null;
}
