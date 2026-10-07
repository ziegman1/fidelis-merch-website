/**
 * Server startup check. Non-production servers refuse to start with production
 * database credentials or live Stripe keys. No env files are loaded here:
 * local development uses only Next's standard non-production env files.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertSafeNonProductionStartup } = await import("@/lib/env-safety");
  assertSafeNonProductionStartup();
}
