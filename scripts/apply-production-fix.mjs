#!/usr/bin/env node
/**
 * Applies fix-production-schema.sql to the database and marks migration as applied.
 * Loads env from .env, .env.local, .env.vercel, .env.production.
 * Supports Vercel Postgres (POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING).
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  const out = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val.trim();
    }
  }
  return out;
}

function cleanUrl(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeDbUrl(url) {
  const u = cleanUrl(url);
  if (!u) return u;
  if (u.startsWith("postgres://")) return "postgresql://" + u.slice(11);
  return u;
}

const env = { ...process.env };
for (const f of [".env", ".env.local", ".env.vercel", ".env.production"]) {
  Object.assign(env, loadEnv(resolve(root, f)));
}

// Vercel Postgres / Neon fallbacks
if (!env.DATABASE_URL?.trim()) {
  env.DATABASE_URL = env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || "";
}
if (!env.DIRECT_URL?.trim()) {
  env.DIRECT_URL =
    env.POSTGRES_URL_NON_POOLING ||
    env.DATABASE_URL_UNPOOLED ||
    env.DATABASE_URL ||
    "";
}

const dbUrl = normalizeDbUrl(env.DATABASE_URL);
const directUrl = normalizeDbUrl(env.DIRECT_URL);

env.DATABASE_URL = dbUrl;
env.DIRECT_URL = directUrl || dbUrl;

if (!dbUrl) {
  console.error("[apply-production-fix] ERROR: DATABASE_URL is not set.");
  console.error("  Set DATABASE_URL or POSTGRES_PRISMA_URL in .env.local or .env.vercel.");
  process.exit(1);
}

if (!/^postgresql:\/\//.test(dbUrl)) {
  console.error("[apply-production-fix] ERROR: Invalid DATABASE_URL. Must start with postgresql://");
  console.error("  Got:", dbUrl ? dbUrl.slice(0, 30) + "..." : "(empty)");
  process.exit(1);
}

console.log("[apply-production-fix] Applying schema fix...");

const sqlPath = resolve(root, "scripts/fix-production-schema.sql");
const r1 = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", sqlPath, "--schema", resolve(root, "prisma/schema.prisma")],
  { stdio: "inherit", env, cwd: root }
);

if (r1.status !== 0) {
  console.error("[apply-production-fix] ERROR: Failed to execute SQL.");
  process.exit(1);
}

console.log("[apply-production-fix] SQL executed successfully. Marking migration as applied...");

const r2 = spawnSync(
  "npx",
  ["prisma", "migrate", "resolve", "--applied", "20250308120000_add_product_status_and_extras", "--schema", resolve(root, "prisma/schema.prisma")],
  { stdio: "pipe", env, cwd: root, encoding: "utf-8" }
);

if (r2.status !== 0) {
  const stderr = r2.stderr || r2.stdout || "";
  if (stderr.includes("already recorded as applied")) {
    console.log("[apply-production-fix] Migration already marked as applied. Done.");
  } else {
    console.error("[apply-production-fix] WARNING: SQL applied but migrate resolve failed.");
    if (r2.stderr) console.error(r2.stderr);
    if (r2.stdout) console.error(r2.stdout);
    console.error("  Run manually: npx prisma migrate resolve --applied 20250308120000_add_product_status_and_extras");
    process.exit(1);
  }
} else {
  console.log("[apply-production-fix] Done. Migration marked as applied.");
}
