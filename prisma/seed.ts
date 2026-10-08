/**
 * Retired legacy seed. It synced real catalog definitions and the live Printify
 * catalog, so it now refuses and writes nothing. Use the guarded synthetic seed:
 *
 *   npm run db:seed:dev -- --confirm-synthetic-dev-seed
 */
export {};

console.error(
  "[seed] prisma/seed.ts is retired and inserts nothing. " +
    "Use the guarded synthetic development seed: npm run db:seed:dev -- --confirm-synthetic-dev-seed"
);
process.exit(1);
