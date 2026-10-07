/**
 * Guarded Prisma CLI wrapper for local database commands (db push, migrate dev,
 * studio, ...). Refuses production databases; production migrations use
 * scripts/migrate-production.ts instead.
 *
 * Usage: tsx scripts/prisma-safe.ts <prisma args...>
 */
import { spawnSync } from "child_process";
import { prepareScriptEnvironment } from "./lib/script-env";
import { assertDatabaseAllowed } from "../src/lib/env-safety";
import { prepareBuildEnv } from "./build-steps";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/prisma-safe.ts <prisma args...>");
  process.exit(1);
}

try {
  prepareScriptEnvironment("prisma-safe");
  const env = prepareBuildEnv(process.env);
  assertDatabaseAllowed(env);
  const result = spawnSync("npx", ["prisma", ...args], { stdio: "inherit", env });
  process.exit(result.status ?? 1);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
