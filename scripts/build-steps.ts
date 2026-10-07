/**
 * Build steps shared by scripts/build.ts and its tests. The build never
 * migrates or otherwise mutates a database; production migrations run only
 * through scripts/migrate-production.ts.
 */
export const BUILD_COMMANDS = ["npx prisma generate", "next build"] as const;

function cleanUrl(s: string): string {
  return s
    .trim()
    .replace(/^["']|["']$/g, "") // strip surrounding quotes
    .trim();
}

/** Maps Vercel Postgres / Neon variable names onto DATABASE_URL / DIRECT_URL. */
export function prepareBuildEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  if (!env.DATABASE_URL?.trim()) {
    env.DATABASE_URL = env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || "";
  }
  if (!env.DIRECT_URL?.trim()) {
    env.DIRECT_URL = env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "";
  }
  const dbUrl = cleanUrl(env.DATABASE_URL || "");
  const directUrl = cleanUrl(env.DIRECT_URL || "");
  if (dbUrl) env.DATABASE_URL = dbUrl;
  if (directUrl) env.DIRECT_URL = directUrl;
  return env;
}
