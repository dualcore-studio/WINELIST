/**
 * Svuota la collezione "wines" in InstantDB.
 * Richiede INSTANT_APP_ADMIN_TOKEN in .env.local.
 * Uso: node scripts/clear-wines.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { init } from "@instantdb/admin";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const appId =
  process.env.NEXT_PUBLIC_INSTANT_APP_ID ??
  process.env.INSTANT_APP_ID ??
  "";
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN ?? "";

if (!appId || appId === "replace_with_your_instant_app_id") {
  console.error("Imposta NEXT_PUBLIC_INSTANT_APP_ID in .env.local.");
  process.exit(1);
}
if (!adminToken) {
  console.error(
    "Imposta INSTANT_APP_ADMIN_TOKEN in .env.local (Instant Dashboard → Admin)."
  );
  process.exit(1);
}

const db = init({ appId, adminToken });

function pickWinesRaw(result) {
  if (result?.wines) return result.wines;
  if (result?.data?.wines) return result.data.wines;
  if (result?.result?.wines) return result.result.wines;
  return null;
}

function normalizeEntityRows(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.values(raw);
}

const result = await db.query({ wines: {} });
const raw = pickWinesRaw(result);
const wines = normalizeEntityRows(raw);

if (wines.length === 0) {
  console.log("Collezione wines già vuota.");
  process.exit(0);
}

const chunks = wines.map((w) => db.tx.wines[w.id].delete());
await db.transact(chunks);
console.log(`Eliminati ${wines.length} vini.`);
