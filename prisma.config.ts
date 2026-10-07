import { defineConfig } from "prisma/config";
import { guardPrismaCli } from "./scripts/lib/prisma-cli-guard";

// Runs before every Prisma CLI command, including direct `npx prisma ...`.
guardPrismaCli();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
