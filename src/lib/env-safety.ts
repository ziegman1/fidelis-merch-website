/**
 * Centralized development / preview / production isolation guards.
 *
 * Every integration that can touch a production resource (database, Stripe,
 * Printify, Resend, Vercel Blob) must consult this module before acting.
 *
 * Environment classification never trusts hostnames or a single variable:
 *  - "test"        NODE_ENV=test or VITEST is set
 *  - "preview"     VERCEL_ENV=preview
 *  - "production"  VERCEL_ENV=production AND NODE_ENV=production
 *                  (a production env pulled into a local `next dev` stays "development"),
 *                  or an explicit production-operator script run (see enableProductionOperatorMode)
 *  - "development" everything else, including local builds
 *
 * Non-production environments fail closed.
 */
import { createHash } from "node:crypto";

export type DeploymentEnvironment = "production" | "preview" | "development" | "test";

type Env = Record<string, string | undefined>;

export class EnvironmentSafetyError extends Error {
  constructor(message: string) {
    super(`[env-safety] ${message}`);
    this.name = "EnvironmentSafetyError";
  }
}

/**
 * SHA-256 of `supabase:<project-ref>` for production databases. Only hashes are
 * stored so the public repository never contains the project reference.
 */
export const PRODUCTION_DATABASE_FINGERPRINTS: ReadonlySet<string> = new Set([
  "30698822b00e73c356ca1816be0a7c582038c41715ad749b55e76e6203ae67a2",
]);

/**
 * SHA-256 of `supabase:<project-ref>` for databases positively approved for
 * development-only tooling (e.g. the synthetic seed). Hashes only, as above.
 */
export const DEVELOPMENT_DATABASE_FINGERPRINTS: ReadonlySet<string> = new Set([
  // fidelis-merch-dev
  "a7979765f6ea614874d4ddde2ee04e4fa7f14c95de6c9d19d01f18b19e31c796",
]);

/**
 * SHA-256 of `vercel-blob-store:<store-id>` for Blob stores that must never be
 * written outside production: the current production store and a second store
 * found in a Vercel-pulled env file whose ownership is unconfirmed.
 */
export const PRODUCTION_BLOB_STORE_FINGERPRINTS: ReadonlySet<string> = new Set([
  "554cec6940a5d742ccafe0690afb3932d1768c88a05f0a783f32e4ae3264b324",
  "a4098df629550a19789cb69a2469daee11dc55dceff4d4cabbed169103c4236d",
]);

export const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
] as const;

/** Safe Resend address that accepts mail without delivering it to a real inbox. */
export const NON_PRODUCTION_EMAIL_SINK = "delivered@resend.dev";

let productionOperatorScript: string | null = null;

export function getDeploymentEnvironment(env: Env = process.env): DeploymentEnvironment {
  if (env.VITEST || env.NODE_ENV === "test") return "test";
  if (env.VERCEL_ENV === "preview") return "preview";
  if (productionOperatorScript) return "production";
  if (env.VERCEL_ENV === "production" && env.NODE_ENV === "production") return "production";
  return "development";
}

export function isProductionEnvironment(env: Env = process.env): boolean {
  return getDeploymentEnvironment(env) === "production";
}

/**
 * Lets an operator script act on production. Requires BOTH the `--production`
 * argument and FIDELIS_PRODUCTION_OPERATOR=<script name>, so a local env file
 * alone can never switch a script to production.
 */
export function enableProductionOperatorMode(
  scriptName: string,
  argv: readonly string[] = process.argv,
  env: Env = process.env
): boolean {
  if (!argv.includes("--production")) return false;
  const current = getDeploymentEnvironment(env);
  if (current === "test" || current === "preview") {
    throw new EnvironmentSafetyError(`Production operator mode is not available in the "${current}" environment.`);
  }
  if (env.FIDELIS_PRODUCTION_OPERATOR !== scriptName) {
    throw new EnvironmentSafetyError(
      `--production requires FIDELIS_PRODUCTION_OPERATOR=${scriptName} to be set explicitly for this command.`
    );
  }
  productionOperatorScript = scriptName;
  console.warn(`[env-safety] PRODUCTION OPERATOR MODE enabled for "${scriptName}". Production resources will be used.`);
  return true;
}

export function resetProductionOperatorModeForTests(): void {
  productionOperatorScript = null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Stable identity for a Postgres URL: `supabase:<ref>` for Supabase projects
 * (pooler username or direct host), otherwise `postgres:<host>:<port>/<db>`.
 * Returns null when the URL cannot be identified.
 */
export function getDatabaseIdentity(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(stripQuotes(rawUrl));
  } catch {
    return null;
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return null;
  const host = url.hostname.toLowerCase();
  if (!host) return null;

  const poolerUser = decodeURIComponent(url.username).match(/^[a-z0-9_]+\.([a-z0-9]{20})$/i);
  if (poolerUser) return `supabase:${poolerUser[1].toLowerCase()}`;
  const directHost = host.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
  if (directHost) return `supabase:${directHost[1]}`;
  if (host.endsWith(".supabase.co") || host.endsWith(".supabase.com")) return null;

  const database = url.pathname.replace(/^\//, "") || "postgres";
  return `postgres:${host}:${url.port || "5432"}/${database}`;
}

export function getDatabaseFingerprint(rawUrl: string): string | null {
  const identity = getDatabaseIdentity(rawUrl);
  return identity ? sha256(identity) : null;
}

export function isProductionDatabaseUrl(rawUrl: string): boolean {
  const fingerprint = getDatabaseFingerprint(rawUrl);
  return fingerprint !== null && PRODUCTION_DATABASE_FINGERPRINTS.has(fingerprint);
}

/**
 * Refuses production or unidentifiable database URLs outside production, and
 * refuses a missing DATABASE_URL in development/preview instead of letting a
 * tool fall back to another env file.
 */
export function assertDatabaseAllowed(env: Env = process.env): void {
  const environment = getDeploymentEnvironment(env);
  if (environment === "production") return;

  if (!env.DATABASE_URL?.trim() && environment !== "test") {
    throw new EnvironmentSafetyError(
      `DATABASE_URL is not set for the "${environment}" environment. Configure a dedicated non-production database ` +
        "(e.g. in .env.development.local). Production credentials are never loaded automatically."
    );
  }

  for (const key of DATABASE_URL_KEYS) {
    const value = env[key];
    if (!value?.trim()) continue;
    const fingerprint = getDatabaseFingerprint(value);
    if (!fingerprint) {
      throw new EnvironmentSafetyError(
        `${key} cannot be identified as a non-production database in the "${environment}" environment; refusing to connect.`
      );
    }
    if (PRODUCTION_DATABASE_FINGERPRINTS.has(fingerprint)) {
      throw new EnvironmentSafetyError(
        `${key} points at the PRODUCTION database in the "${environment}" environment; refusing to connect. ` +
          "Use a separate development/test database."
      );
    }
  }
}

/**
 * For development-only tools that write data. On top of assertDatabaseAllowed,
 * requires the "development" environment and every configured database URL to
 * positively match DEVELOPMENT_DATABASE_FINGERPRINTS.
 */
export function assertApprovedDevelopmentDatabase(env: Env = process.env): void {
  const environment = getDeploymentEnvironment(env);
  if (environment !== "development") {
    throw new EnvironmentSafetyError(`This command only runs in the "development" environment, not "${environment}".`);
  }
  assertDatabaseAllowed(env);
  for (const key of DATABASE_URL_KEYS) {
    const value = env[key];
    if (!value?.trim()) continue;
    const fingerprint = getDatabaseFingerprint(value);
    if (!fingerprint || !DEVELOPMENT_DATABASE_FINGERPRINTS.has(fingerprint)) {
      throw new EnvironmentSafetyError(`${key} is not an approved development database; refusing.`);
    }
  }
}

export function isStripeSecretKeyAllowed(key: string, env: Env = process.env): boolean {
  if (isProductionEnvironment(env)) return true;
  return /^(sk|rk)_test_/.test(key);
}

/** Returns the key unchanged when allowed; outside production only Stripe test-mode keys are accepted. */
export function assertStripeSecretKeyAllowed(key: string, env: Env = process.env): string {
  if (isStripeSecretKeyAllowed(key, env)) return key;
  const environment = getDeploymentEnvironment(env);
  const kind = /^(sk|rk)_live_/.test(stripQuotes(key)) ? "a LIVE-mode Stripe key" : "an unrecognized Stripe key";
  throw new EnvironmentSafetyError(
    `STRIPE_SECRET_KEY is ${kind} in the "${environment}" environment; only sk_test_/rk_test_ keys are allowed outside production.`
  );
}

export function assertStripePublishableKeyAllowed(key: string, env: Env = process.env): string {
  if (isProductionEnvironment(env) || /^pk_test_/.test(key)) return key;
  throw new EnvironmentSafetyError(
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not a pk_test_ key in the "${getDeploymentEnvironment(env)}" environment.`
  );
}

/** Printify order creation/mutation is production-only, with no override. */
export function assertPrintifyWriteAllowed(env: Env = process.env): void {
  const environment = getDeploymentEnvironment(env);
  if (environment === "production") return;
  throw new EnvironmentSafetyError(`Printify order creation is disabled in the "${environment}" environment.`);
}

/**
 * Read-only Printify calls (catalog fetch, shipping quote) are disabled outside
 * production unless FIDELIS_ALLOW_PRINTIFY_READS=true; always disabled in tests.
 */
export function isPrintifyReadAllowed(env: Env = process.env): boolean {
  const environment = getDeploymentEnvironment(env);
  if (environment === "production") return true;
  if (environment === "test") return false;
  return env.FIDELIS_ALLOW_PRINTIFY_READS === "true";
}

export function assertPrintifyReadAllowed(env: Env = process.env): void {
  if (isPrintifyReadAllowed(env)) return;
  throw new EnvironmentSafetyError(
    `Printify API reads are disabled in the "${getDeploymentEnvironment(env)}" environment ` +
      "(set FIDELIS_ALLOW_PRINTIFY_READS=true outside tests to allow read-only calls)."
  );
}

export type EmailDeliveryMode = "send" | "sink" | "suppress";

/**
 * production: deliver normally. test: always suppressed. development/preview:
 * suppressed unless FIDELIS_EMAIL_SINK=resend-test, which reroutes every
 * message to NON_PRODUCTION_EMAIL_SINK.
 */
export function getEmailDeliveryMode(env: Env = process.env): EmailDeliveryMode {
  const environment = getDeploymentEnvironment(env);
  if (environment === "production") return "send";
  if (environment === "test") return "suppress";
  return env.FIDELIS_EMAIL_SINK === "resend-test" ? "sink" : "suppress";
}

export function getBlobStoreFingerprint(token: string): string | null {
  const match = stripQuotes(token).match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return match ? sha256(`vercel-blob-store:${match[1]}`) : null;
}

/**
 * Blob writes outside production require FIDELIS_ALLOW_BLOB_WRITES=true and a
 * token for an identifiable, non-production store. Always disabled in tests.
 */
export function assertBlobWriteAllowed(env: Env = process.env): void {
  const environment = getDeploymentEnvironment(env);
  if (environment === "production") return;
  if (environment === "test") {
    throw new EnvironmentSafetyError("Blob writes are disabled in the test environment.");
  }
  if (env.FIDELIS_ALLOW_BLOB_WRITES !== "true") {
    throw new EnvironmentSafetyError(
      `Blob writes are disabled in the "${environment}" environment (set FIDELIS_ALLOW_BLOB_WRITES=true with a non-production store token).`
    );
  }
  const fingerprint = env.BLOB_READ_WRITE_TOKEN ? getBlobStoreFingerprint(env.BLOB_READ_WRITE_TOKEN) : null;
  if (!fingerprint) {
    throw new EnvironmentSafetyError(`BLOB_READ_WRITE_TOKEN is missing or unrecognized in the "${environment}" environment.`);
  }
  if (PRODUCTION_BLOB_STORE_FINGERPRINTS.has(fingerprint)) {
    throw new EnvironmentSafetyError(
      `BLOB_READ_WRITE_TOKEN belongs to the PRODUCTION Blob store; refusing writes in the "${environment}" environment.`
    );
  }
}

/**
 * Startup check for non-production servers: fails fast on production database
 * credentials or live Stripe keys instead of waiting for the first request.
 */
export function assertSafeNonProductionStartup(env: Env = process.env): void {
  if (isProductionEnvironment(env)) return;
  assertDatabaseAllowed(env);
  if (env.STRIPE_SECRET_KEY) assertStripeSecretKeyAllowed(env.STRIPE_SECRET_KEY, env);
  if (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    assertStripePublishableKeyAllowed(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, env);
  }
}
