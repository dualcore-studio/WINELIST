/**
 * Seed / upsert vini — catalogo (bin 322–463, nazione/regione per riga se presenti).
 * Dati: src/data/page26-california-wines.json
 *
 * Richiede in .env.local: NEXT_PUBLIC_INSTANT_APP_ID, INSTANT_APP_ADMIN_TOKEN
 * Uso: npm run seed:page26
 *
 * Senza token admin: in dev apri /wines?seedPage26=1 (import lato client).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { init, id } from "@instantdb/admin";

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
    "Imposta INSTANT_APP_ADMIN_TOKEN in .env.local (Instant Dashboard → Admin).\n" +
      "Oppure in sviluppo: avvia il server e apri /wines?seedPage26=1 nel browser."
  );
  process.exit(1);
}

const db = init({ appId, adminToken });

const catalogPath = resolve(process.cwd(), "src/data/page26-california-wines.json");
if (!existsSync(catalogPath)) {
  console.error("Manca il file:", catalogPath);
  process.exit(1);
}

const ROWS = JSON.parse(readFileSync(catalogPath, "utf8"));

const TYPE = "Rosso";
const DEFAULT_COUNTRY = "Stati Uniti";
const DEFAULT_REGION = "California";

const CATEGORY_OK = new Set([
  "DOCG",
  "DOC",
  "IGT",
  "DOP",
  "IGP",
  "VdT",
  "AOC",
  "AVA",
  "Riserva"
]);

function normalizeCategory(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return CATEGORY_OK.has(s) ? s : "";
}

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

const queryResult = await db.query({ wines: {} });
const existingRows = normalizeEntityRows(pickWinesRaw(queryResult));
const byBin = new Map();
for (const w of existingRows) {
  const b = Number(w.binNumber);
  if (Number.isFinite(b) && b > 0) byBin.set(b, w);
}

const now = new Date().toISOString();
const txs = [];

for (const row of ROWS) {
  const prev = byBin.get(row.binNumber);
  const entityId = prev?.id ?? id();
  const payload = {
    name: String(row.name).trim(),
    winery: String(row.winery).trim(),
    type: TYPE,
    category: normalizeCategory(row.category),
    grape: String(row.grape).trim(),
    region: String(row.region ?? "").trim() || DEFAULT_REGION,
    country: String(row.country ?? "").trim() || DEFAULT_COUNTRY,
    binNumber: Number(row.binNumber),
    vintage: Number(row.vintage),
    price: Number(row.price),
    quantity: 1,
    isAvailable: true,
    isFeatured: false,
    displayOrder: 0,
    updatedAt: now
  };
  if (!prev) {
    payload.createdAt = now;
  }
  txs.push(db.tx.wines[entityId].update(payload));
}

const CHUNK = 40;
for (let i = 0; i < txs.length; i += CHUNK) {
  await db.transact(txs.slice(i, i + CHUNK));
}

const inserted = ROWS.filter((r) => !byBin.has(r.binNumber)).length;
const updated = ROWS.length - inserted;
console.log(
  `Catalogo seed: ${ROWS.length} righe — ${inserted} nuovi, ${updated} aggiornati (stesso Bin).`
);
