#!/usr/bin/env node
/**
 * Runs Prisma CLI with env from .env.local and .env.
 * Sets DIRECT_URL from DATABASE_URL if not set (for local dev / Vercel Postgres).
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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
      out[key] = val;
    }
  }
  return out;
}

const env = { ...process.env };
const local = loadEnv(resolve(process.cwd(), ".env.local"));
const root = loadEnv(resolve(process.cwd(), ".env"));
Object.assign(env, root, local);

if (!env.DIRECT_URL?.trim() && env.DATABASE_URL?.trim()) {
  env.DIRECT_URL = env.DATABASE_URL;
}

const args = process.argv.slice(2);
const r = spawnSync("npx", ["prisma", ...args], { stdio: "inherit", env });
process.exit(r.status ?? 1);
