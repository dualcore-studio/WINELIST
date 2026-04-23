/**
 * Rimuove record duplicati in InstantDB: stesso Bin Number (> 0).
 * Mantiene il record con updatedAt più recente (poi createdAt, poi id).
 * Bin ≤ 0: non toccati (più vini senza bin assegnato possono coesistere).
 *
 * Richiede INSTANT_APP_ADMIN_TOKEN in .env.local.
 * Uso: npm run dedupe:wines
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
  process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? process.env.INSTANT_APP_ID ?? "";
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

function binOf(w) {
  const n = Number(w.binNumber ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.trunc(n);
}

function score(w) {
  const u = String(w.updatedAt ?? "");
  const c = String(w.createdAt ?? "");
  const id = String(w.id ?? "");
  return [u, c, id];
}

function better(a, b) {
  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < 3; i++) {
    if (sa[i] > sb[i]) return a;
    if (sa[i] < sb[i]) return b;
  }
  return a;
}

const result = await db.query({ wines: {} });
const wines = normalizeEntityRows(pickWinesRaw(result));

const byBin = new Map();
for (const w of wines) {
  const b = binOf(w);
  if (b <= 0) continue;
  const id = w.id;
  if (!id) continue;
  const list = byBin.get(b) ?? [];
  list.push(w);
  byBin.set(b, list);
}

const toDelete = [];
for (const [, group] of byBin) {
  if (group.length < 2) continue;
  let keep = group[0];
  for (let i = 1; i < group.length; i++) {
    keep = better(keep, group[i]);
  }
  for (const w of group) {
    if (w.id !== keep.id) toDelete.push(w.id);
  }
}

if (toDelete.length === 0) {
  console.log("Nessun duplicato per Bin Number trovato.");
  process.exit(0);
}

const txs = toDelete.map((id) => db.tx.wines[id].delete());
const CHUNK = 50;
for (let i = 0; i < txs.length; i += CHUNK) {
  await db.transact(txs.slice(i, i + CHUNK));
}

console.log(
  `Eliminati ${toDelete.length} record duplicati (stesso Bin). Conservato il più recente per ogni bin.`
);
