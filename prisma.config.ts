import { defineConfig } from "prisma/config";
import { guardPrismaCli } from "./scripts/lib/prisma-cli-guard";

// Runs before every Prisma CLI command, including direct `npx prisma ...`.
guardPrismaCli();

// No migrations.seed hook: seeding is only ever the explicit `npm run db:seed:dev`.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
