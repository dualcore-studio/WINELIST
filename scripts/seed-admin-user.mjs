/**
 * Crea il primo utente amministratore in InstantDB (collection `appUsers`).
 * Richiede INSTANT_APP_ADMIN_TOKEN in .env.local.
 * Uso: node scripts/seed-admin-user.mjs --username=admin --password=... [--force]
 *
 * Hashing password: tenere in sync con src/lib/auth/password.ts (stesso formato "salt:hash").
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
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

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? process.env.INSTANT_APP_ID ?? "";
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN ?? "";

if (!appId || appId === "replace_with_your_instant_app_id") {
  console.error("Imposta NEXT_PUBLIC_INSTANT_APP_ID in .env.local.");
  process.exit(1);
}
if (!adminToken) {
  console.error("Imposta INSTANT_APP_ADMIN_TOKEN in .env.local (Instant Dashboard → Admin).");
  process.exit(1);
}

const db = init({ appId, adminToken });

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function pickAppUsersRaw(result) {
  if (result?.appUsers) return result.appUsers;
  if (result?.data?.appUsers) return result.data.appUsers;
  if (result?.result?.appUsers) return result.result.appUsers;
  return null;
}

function normalizeEntityRows(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.values(raw);
}

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const force = process.argv.includes("--force");

let username = argValue("username");
let password = argValue("password");

if (!username || !password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (!username) username = (await rl.question("Username admin: ")).trim();
  if (!password) password = await rl.question("Password admin: ");
  rl.close();
}

username = username.trim();

if (!username || !password) {
  console.error("Username e password sono obbligatori.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La password deve avere almeno 8 caratteri.");
  process.exit(1);
}

const result = await db.query({ appUsers: {} });
const existing = normalizeEntityRows(pickAppUsersRaw(result));
const duplicate = existing.find((u) => u.username?.toLowerCase() === username.toLowerCase());

if (duplicate && !force) {
  console.error(
    `Esiste già un utente "${duplicate.username}". Usa --force per crearne un altro con lo stesso username, oppure scegline uno diverso.`
  );
  process.exit(1);
}

const newId = id();
await db.transact([
  db.tx.appUsers[newId].update({
    username,
    passwordHash: hashPassword(password),
    isAdmin: true,
    createdAt: Date.now()
  })
]);

console.log(`Utente admin "${username}" creato con id ${newId}.`);
