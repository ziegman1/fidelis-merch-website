/**
 * Guard for every Prisma CLI invocation, run from prisma.config.ts before
 * Prisma connects. With a config file present Prisma no longer loads .env on
 * its own, so this is also the only place env files are loaded for the CLI.
 *
 * - Commands that never touch a database (generate, validate, ...) are not guarded.
 * - Production platform (VERCEL_ENV=production + NODE_ENV=production): no env
 *   files are loaded and no guard applies.
 * - Production migration: only `migrate deploy` / `migrate status`, only with
 *   FIDELIS_PRODUCTION_OPERATOR=migrate-production and
 *   FIDELIS_PRODUCTION_MIGRATION_CONFIRMED=true already in the shell (set by
 *   scripts/migrate-production.ts), only against a URL positively identified as
 *   production, and without loading env files.
 * - Everything else: load the same env files as `next dev`, then refuse
 *   production or unidentifiable databases (assertDatabaseAllowed).
 */
import { loadEnvConfig } from "@next/env";
import {
  assertDatabaseAllowed,
  EnvironmentSafetyError,
  getDeploymentEnvironment,
  isProductionDatabaseUrl,
  isProductionEnvironment,
} from "../../src/lib/env-safety";
import { prepareBuildEnv } from "../build-steps";

type Env = Record<string, string | undefined>;

const COMMANDS_WITHOUT_DATABASE = new Set(["generate", "validate", "format", "version", "init", "help", "debug"]);
const FLAGS_WITHOUT_DATABASE = new Set(["-v", "--version", "-h", "--help"]);
const PRODUCTION_MIGRATION_COMMANDS = new Set(["migrate deploy", "migrate status"]);

export function getPrismaCommand(args: readonly string[]): string {
  const [command = "", sub] = args;
  return sub && !sub.startsWith("-") ? `${command} ${sub}` : command;
}

export function prismaCommandRequiresDatabaseGuard(args: readonly string[]): boolean {
  if (args.length === 0) return false;
  const [command] = args;
  if (FLAGS_WITHOUT_DATABASE.has(command)) return false;
  return !COMMANDS_WITHOUT_DATABASE.has(command);
}

function loadLocalEnvFiles(): void {
  loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
}

export function guardPrismaCli(
  args: readonly string[] = process.argv.slice(2),
  env: Env = process.env,
  loadEnvFiles: () => void = loadLocalEnvFiles
): "production-migration" | "production" | "guarded" | "no-database" {
  const command = getPrismaCommand(args);
  const requiresGuard = prismaCommandRequiresDatabaseGuard(args);

  const operator = env.FIDELIS_PRODUCTION_OPERATOR;
  const migrationConfirmed = env.FIDELIS_PRODUCTION_MIGRATION_CONFIRMED === "true";
  if (operator === "migrate-production" && migrationConfirmed) {
    const current = getDeploymentEnvironment(env);
    if (current === "test" || current === "preview") {
      throw new EnvironmentSafetyError(`Production migration mode is not available in the "${current}" environment.`);
    }
    if (!PRODUCTION_MIGRATION_COMMANDS.has(command)) {
      throw new EnvironmentSafetyError(`Production migration mode only allows "migrate deploy" and "migrate status", not "${command}".`);
    }
    const directUrl = env.DIRECT_URL || env.DATABASE_URL || "";
    if (!isProductionDatabaseUrl(directUrl)) {
      throw new EnvironmentSafetyError("Production migration mode requires DIRECT_URL to identify the production database.");
    }
    return "production-migration";
  }

  if (isProductionEnvironment(env)) return "production";

  loadEnvFiles();

  if (!requiresGuard) return "no-database";

  const mapped = prepareBuildEnv(env as NodeJS.ProcessEnv);
  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    if (!env[key] && mapped[key]) env[key] = mapped[key];
  }
  assertDatabaseAllowed(env);
  return "guarded";
}
