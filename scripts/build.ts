#!/usr/bin/env node
/**
 * Build script with Prisma env fallbacks.
 * Maps POSTGRES_PRISMA_URL → DATABASE_URL, POSTGRES_URL_NON_POOLING → DIRECT_URL
 * when not set (Vercel Postgres / Neon).
 */
import { execSync } from "child_process";

const env = { ...process.env };

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

function cleanUrl(s: string): string {
  return s
    .trim()
    .replace(/^["']|["']$/g, "") // strip surrounding quotes
    .trim();
}

const dbUrl = cleanUrl(env.DATABASE_URL || "");
const directUrl = cleanUrl(env.DIRECT_URL || "");
if (dbUrl) env.DATABASE_URL = dbUrl;
if (directUrl) env.DIRECT_URL = directUrl;
const validDb = /^postgres(ql)?:\/\//.test(dbUrl);
const validDirect = /^postgres(ql)?:\/\//.test(directUrl);

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", env });
}

run("npx prisma generate");

if (!validDb || !validDirect) {
  console.warn(
    "[build] Skipping prisma migrate deploy: DATABASE_URL or DIRECT_URL invalid or missing.\n" +
      "  Set DATABASE_URL and DIRECT_URL in Vercel, or use POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING (Vercel Postgres)."
  );
} else {
  try {
    run("npx prisma migrate deploy");
  } catch (e) {
    console.warn("[build] prisma migrate deploy failed, continuing with next build:", (e as Error).message);
  }
}

run("next build");
