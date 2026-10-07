import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const execSyncMock = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({ execSync: execSyncMock }));

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

const DB_MUTATION = /prisma\s+(migrate|db\s+(push|execute)|db:)|migrate\s+deploy|db\s+push/;

describe("the build performs no database mutation", () => {
  it("npm run build executes only prisma generate and next build", async () => {
    process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/none";
    process.env.DIRECT_URL = "postgresql://invalid:invalid@127.0.0.1:1/none";
    await import("../build");
    expect(execSyncMock.mock.calls.map((c) => c[0])).toEqual(["npx prisma generate", "next build"]);
  });

  it("build sources and lifecycle scripts contain no migration or db push", () => {
    expect(pkg.scripts.build).toBe("tsx scripts/build.ts");
    for (const name of ["prebuild", "postbuild", "postinstall", "vercel-build"]) {
      expect(pkg.scripts[name]).toBeUndefined();
    }
    expect(read("scripts/build.ts")).not.toMatch(DB_MUTATION);
    expect(read("scripts/build-steps.ts")).not.toMatch(DB_MUTATION);
  });

  it("production migration is a separate, explicitly confirmed command", () => {
    expect(pkg.scripts["db:migrate:production"]).toBe("tsx scripts/migrate-production.ts");
    const source = read("scripts/migrate-production.ts");
    expect(source).toContain("--confirm-production-migration");
    expect(source).toContain('enableProductionOperatorMode("migrate-production"');
    expect(source).toContain("PRODUCTION_DATABASE_FINGERPRINTS.has(fingerprint)");
  });
});

describe("production env files are never auto-loaded", () => {
  it("npm run dev does not load env files itself", () => {
    expect(pkg.scripts.dev).toBe("next dev");
  });

  it("no npm script references dotenv, .env.production or .env.vercel", () => {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      expect(cmd, name).not.toMatch(/dotenv|\.env\.production|\.env\.vercel/);
    }
  });

  it("instrumentation, scripts and seeds do not read production env files", () => {
    const files = [
      "src/instrumentation.ts",
      "prisma/seed.ts",
      "prisma/seed-admin.ts",
      ...readdirSync(resolve(root, "scripts"))
        .filter((f) => /\.(ts|mjs|js)$/.test(f))
        .map((f) => `scripts/${f}`),
      "scripts/lib/script-env.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(/\.env\.production|\.env\.vercel|from "dotenv"/);
    }
  });

  it("database scripts go through the guarded Prisma wrapper", () => {
    for (const name of ["db:push", "db:migrate", "db:migrate:deploy", "db:migrate:resolve", "db:studio", "db:validate"]) {
      expect(pkg.scripts[name], name).toMatch(/^tsx scripts\/prisma-safe\.ts /);
    }
  });
});

describe("dangerous one-time scripts are removed", () => {
  it.each(["scripts/apply-production-fix.mjs", "scripts/fix-production-schema.sql", "scripts/prisma-with-env.mjs"])(
    "%s no longer exists",
    (file) => {
      expect(existsSync(resolve(root, file))).toBe(false);
    }
  );

  it("their npm scripts are removed", () => {
    expect(pkg.scripts["db:fix:production"]).toBeUndefined();
    expect(pkg.scripts["db:execute:migration"]).toBeUndefined();
  });
});

describe(".vercelignore", () => {
  it("excludes local env files but keeps .env.example", () => {
    const lines = read(".vercelignore")
      .split("\n")
      .map((l) => l.trim());
    for (const entry of [".env", ".env.*", "!.env.example", ".next", "node_modules", ".vercel"]) {
      expect(lines).toContain(entry);
    }
  });
});
