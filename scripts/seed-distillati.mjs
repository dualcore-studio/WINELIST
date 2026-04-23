/**
 * Seed / upsert distillati — dati da src/data/distillati.json.
 * Scrive nell'entità `wines` con collectionTag = "grappeDistillati".
 *
 * Match idempotente: (name + winery) case-insensitive.
 *
 * Richiede in .env.local: NEXT_PUBLIC_INSTANT_APP_ID, INSTANT_APP_ADMIN_TOKEN
 * Uso: npm run seed:distillati
 *
 * Senza token admin: in dev apri /grappe-distillati?seedDistillati=1 nel browser.
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
      "Oppure in sviluppo: avvia il server e apri /grappe-distillati?seedDistillati=1 nel browser."
  );
  process.exit(1);
}

const db = init({ appId, adminToken });

const catalogPath = resolve(process.cwd(), "src/data/distillati.json");
if (!existsSync(catalogPath)) {
  console.error("Manca il file:", catalogPath);
  process.exit(1);
}

const ROWS = JSON.parse(readFileSync(catalogPath, "utf8"));

const COLLECTION_TAG = "grappeDistillati";

/** Default per i campi non esposti nel form distillati (schema condiviso con winelist). */
const DEFAULTS = {
  type: "Fortificato",
  category: "",
  grape: "",
  region: "—",
  country: "Italia",
  binNumber: 0,
  vintage: new Date().getFullYear(),
  quantity: 1,
  isAvailable: true,
  isFeatured: false,
  displayOrder: 0
};

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

function matchKey(name, winery) {
  return `${String(name).trim().toLowerCase()}::${String(winery).trim().toLowerCase()}`;
}

const queryResult = await db.query({ wines: {} });
const allRows = normalizeEntityRows(pickWinesRaw(queryResult));
const existingDistillati = allRows.filter(
  (w) => String(w?.collectionTag ?? "") === COLLECTION_TAG
);
const byKey = new Map();
for (const w of existingDistillati) {
  byKey.set(matchKey(w.name ?? "", w.winery ?? ""), w);
}

const now = new Date().toISOString();
const txs = [];
let inserted = 0;
let updated = 0;

for (const row of ROWS) {
  const key = matchKey(row.name, row.winery);
  const prev = byKey.get(key);
  const entityId = prev?.id ?? id();
  const payload = {
    name: String(row.name).trim(),
    winery: String(row.winery).trim(),
    spiritType: String(row.spiritType ?? "").trim(),
    price: Number(row.price),
    pricePerGlass: Number(row.pricePerGlass),
    type: DEFAULTS.type,
    category: DEFAULTS.category,
    grape: DEFAULTS.grape,
    region: DEFAULTS.region,
    country: DEFAULTS.country,
    binNumber: DEFAULTS.binNumber,
    vintage: DEFAULTS.vintage,
    quantity: DEFAULTS.quantity,
    isAvailable: DEFAULTS.isAvailable,
    isFeatured: DEFAULTS.isFeatured,
    displayOrder: DEFAULTS.displayOrder,
    collectionTag: COLLECTION_TAG,
    updatedAt: now
  };
  if (!prev) {
    payload.createdAt = now;
    inserted++;
  } else {
    updated++;
  }
  txs.push(db.tx.wines[entityId].update(payload));
}

const CHUNK = 40;
for (let i = 0; i < txs.length; i += CHUNK) {
  await db.transact(txs.slice(i, i + CHUNK));
}

console.log(
  `Distillati seed: ${ROWS.length} righe — ${inserted} nuovi, ${updated} aggiornati (stesso nome+produttore).`
);
