/**
 * Explicit, auditable production migration. The build never migrates.
 *
 * Requirements (all mandatory):
 *   - `--production` and `--confirm-production-migration` arguments
 *   - FIDELIS_PRODUCTION_OPERATOR=migrate-production in the shell environment
 *   - DIRECT_URL (or DATABASE_URL) supplied in the shell; no env files are loaded
 *   - the URL must positively identify the production database
 *
 * Usage:
 *   FIDELIS_PRODUCTION_OPERATOR=migrate-production DIRECT_URL=... \
 *     npm run db:migrate:production -- --production --confirm-production-migration [--status-only]
 *
 * Exits non-zero if `prisma migrate deploy` fails.
 */
import { execSync, spawnSync } from "child_process";
import { readdirSync } from "fs";
import { userInfo } from "os";
import { resolve } from "path";
import {
  enableProductionOperatorMode,
  getDatabaseFingerprint,
  PRODUCTION_DATABASE_FINGERPRINTS,
} from "../src/lib/env-safety";
import { prepareBuildEnv } from "./build-steps";

function fail(message: string): never {
  console.error(`[migrate-production] ${message}`);
  process.exit(1);
}

function gitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function main() {
  const argv = process.argv;
  if (!argv.includes("--confirm-production-migration")) {
    fail("Refusing to run without --confirm-production-migration.");
  }
  try {
    if (!enableProductionOperatorMode("migrate-production", argv)) {
      fail("Refusing to run without --production.");
    }
  } catch (e) {
    fail((e as Error).message);
  }

  // The confirmation marker lets prisma.config.ts admit only migrate status/deploy against production.
  const env: NodeJS.ProcessEnv = { ...prepareBuildEnv(process.env), FIDELIS_PRODUCTION_MIGRATION_CONFIRMED: "true" };
  if (!env.DIRECT_URL) fail("DIRECT_URL (or DATABASE_URL) must be set explicitly in the shell.");
  const fingerprint = getDatabaseFingerprint(env.DIRECT_URL);
  if (!fingerprint || !PRODUCTION_DATABASE_FINGERPRINTS.has(fingerprint)) {
    fail("DIRECT_URL does not identify the production database; refusing.");
  }

  const migrations = readdirSync(resolve(process.cwd(), "prisma/migrations"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log("[migrate-production] audit", {
    startedAt: new Date().toISOString(),
    operator: userInfo().username,
    gitCommit: gitHead(),
    databaseFingerprint: fingerprint.slice(0, 12),
    migrationsInRepo: migrations.length,
    latestMigration: migrations[migrations.length - 1],
  });

  // `migrate status` exits non-zero when migrations are pending; it is informational here.
  spawnSync("npx", ["prisma", "migrate", "status"], { stdio: "inherit", env });

  if (argv.includes("--status-only")) {
    console.log("[migrate-production] --status-only: no changes applied.");
    return;
  }

  const deploy = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
  if (deploy.status !== 0) {
    fail(`prisma migrate deploy FAILED (exit ${deploy.status ?? "unknown"}). Do not deploy code that depends on these migrations.`);
  }
  console.log("[migrate-production] migrate deploy succeeded", { finishedAt: new Date().toISOString() });
}

main();
