#!/usr/bin/env node
/**
 * Build script with Prisma env fallbacks.
 * Maps POSTGRES_PRISMA_URL → DATABASE_URL, POSTGRES_URL_NON_POOLING → DIRECT_URL
 * when not set (Vercel Postgres / Neon).
 *
 * Does not run migrations. Apply production migrations explicitly with
 * `npm run db:migrate:production` before deploying code that needs them.
 */
import { execSync } from "child_process";
import { BUILD_COMMANDS, prepareBuildEnv } from "./build-steps";

const env = prepareBuildEnv(process.env);

for (const cmd of BUILD_COMMANDS) {
  execSync(cmd, { stdio: "inherit", env });
}
