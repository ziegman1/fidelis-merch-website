/**
 * Environment setup for local operational scripts.
 *
 * Default: loads the same files as `next dev` (.env.development.local,
 * .env.local, .env.development, .env) and never production or Vercel-pulled
 * env files, then refuses production database credentials and live Stripe keys.
 *
 * Production: only scripts that opt in, and only with `--production` plus
 * FIDELIS_PRODUCTION_OPERATOR=<script name>. In that mode no env files are
 * loaded; production credentials must be supplied explicitly in the shell.
 */
import { loadEnvConfig } from "@next/env";
import {
  assertDatabaseAllowed,
  assertSafeNonProductionStartup,
  enableProductionOperatorMode,
  getDeploymentEnvironment,
  type DeploymentEnvironment,
} from "../../src/lib/env-safety";

export function prepareScriptEnvironment(
  scriptName: string,
  options: { allowProductionOperator?: boolean } = {}
): DeploymentEnvironment {
  if (process.argv.includes("--production")) {
    if (!options.allowProductionOperator) {
      throw new Error(`[${scriptName}] --production is not supported; this script is non-production only.`);
    }
    enableProductionOperatorMode(scriptName);
  } else {
    loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
  }

  const environment = getDeploymentEnvironment();
  if (environment !== "production") {
    assertSafeNonProductionStartup();
  }
  assertDatabaseAllowed();
  console.log(`[${scriptName}] environment: ${environment}`);
  return environment;
}
