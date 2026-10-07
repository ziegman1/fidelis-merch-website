import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { PRODUCTION_DATABASE_FINGERPRINTS } from "../../src/lib/env-safety";
import { getPrismaCommand, guardPrismaCli, prismaCommandRequiresDatabaseGuard } from "../lib/prisma-cli-guard";

const root = resolve(__dirname, "../..");
const FAKE_PROD_REF = "qrstuvwxyzabcdefghij";
const FAKE_PROD_FINGERPRINT = createHash("sha256").update(`supabase:${FAKE_PROD_REF}`).digest("hex");
// Unreachable host; identity comes from the pooler username.
const PROD_URL = `postgresql://postgres.${FAKE_PROD_REF}:pw@127.0.0.1:1/postgres`;
const DEV_URL = "postgresql://dev:dev@127.0.0.1:1/fidelis_dev";

const DEVELOPMENT = { NODE_ENV: "development" };
const PREVIEW = { VERCEL_ENV: "preview", NODE_ENV: "production" };
const PRODUCTION = { VERCEL_ENV: "production", NODE_ENV: "production" };
const MIGRATION_OPERATOR = { FIDELIS_PRODUCTION_OPERATOR: "migrate-production", FIDELIS_PRODUCTION_MIGRATION_CONFIRMED: "true" };

const DB_COMMANDS = [
  ["migrate", "dev"],
  ["migrate", "deploy"],
  ["migrate", "reset", "--force"],
  ["migrate", "resolve", "--applied", "x"],
  ["migrate", "status"],
  ["db", "push"],
  ["db", "seed"],
  ["db", "execute", "--stdin"],
  ["db", "pull"],
  ["studio"],
];

let noLoad: Mock<() => void>;

beforeEach(() => {
  noLoad = vi.fn<() => void>();
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).add(FAKE_PROD_FINGERPRINT);
});

afterEach(() => {
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_PROD_FINGERPRINT);
});

describe("command classification", () => {
  it("guards every database command and unknown commands", () => {
    for (const args of DB_COMMANDS) expect(prismaCommandRequiresDatabaseGuard(args), args.join(" ")).toBe(true);
    expect(prismaCommandRequiresDatabaseGuard(["some-future-command"])).toBe(true);
    expect(prismaCommandRequiresDatabaseGuard(["--schema", "x", "migrate", "deploy"])).toBe(true);
  });

  it("does not guard commands that never connect", () => {
    for (const args of [["generate"], ["validate"], ["format"], ["version"], ["--version"], ["-v"], ["--help"], []]) {
      expect(prismaCommandRequiresDatabaseGuard(args), args.join(" ")).toBe(false);
    }
  });

  it("parses command and subcommand", () => {
    expect(getPrismaCommand(["migrate", "deploy", "--schema", "x"])).toBe("migrate deploy");
    expect(getPrismaCommand(["studio", "--port", "5555"])).toBe("studio");
  });
});

describe("direct Prisma refuses the production database outside production", () => {
  it.each(DB_COMMANDS)("development: prisma %s %s", (...args) => {
    const env = { ...DEVELOPMENT, DATABASE_URL: PROD_URL, DIRECT_URL: PROD_URL };
    expect(() => guardPrismaCli(args, env, noLoad)).toThrow(/PRODUCTION database/);
  });

  it.each(DB_COMMANDS)("preview: prisma %s %s", (...args) => {
    const env = { ...PREVIEW, DATABASE_URL: PROD_URL, DIRECT_URL: PROD_URL };
    expect(() => guardPrismaCli(args, env, noLoad)).toThrow(/PRODUCTION database/);
  });

  it("refuses when only DIRECT_URL is production", () => {
    expect(() => guardPrismaCli(["migrate", "dev"], { ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: PROD_URL }, noLoad)).toThrow(
      /DIRECT_URL/
    );
  });

  it("refuses database commands without a configured database", () => {
    expect(() => guardPrismaCli(["db", "push"], { ...DEVELOPMENT }, noLoad)).toThrow(/DATABASE_URL is not set/);
  });

  it("loads local env files before checking", () => {
    const env: Record<string, string | undefined> = { ...DEVELOPMENT };
    const load = vi.fn(() => {
      env.DATABASE_URL = PROD_URL;
    });
    expect(() => guardPrismaCli(["migrate", "dev"], env, load)).toThrow(/PRODUCTION database/);
    expect(load).toHaveBeenCalledOnce();
  });
});

describe("safe development databases remain usable", () => {
  it.each(DB_COMMANDS)("development: prisma %s %s", (...args) => {
    expect(guardPrismaCli(args, { ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: DEV_URL }, noLoad)).toBe("guarded");
  });

  it("fills DIRECT_URL from DATABASE_URL like the old wrapper", () => {
    const env: Record<string, string | undefined> = { ...DEVELOPMENT, DATABASE_URL: DEV_URL };
    guardPrismaCli(["migrate", "dev"], env, noLoad);
    expect(env.DIRECT_URL).toBe(DEV_URL);
  });
});

describe("prisma generate stays usable without production credentials", () => {
  it("needs no database URL in development, preview or an unknown build environment", () => {
    expect(guardPrismaCli(["generate"], { ...DEVELOPMENT }, noLoad)).toBe("no-database");
    expect(guardPrismaCli(["generate"], { ...PREVIEW }, noLoad)).toBe("no-database");
    expect(guardPrismaCli(["generate"], {}, noLoad)).toBe("no-database");
  });

  it("is not blocked by production URLs during a Vercel build whose NODE_ENV is unset", () => {
    expect(guardPrismaCli(["generate"], { VERCEL_ENV: "production", DATABASE_URL: PROD_URL }, noLoad)).toBe("no-database");
  });
});

describe("production platform and the production migration operator flow", () => {
  it("production runtime is not guarded and loads no env files", () => {
    expect(guardPrismaCli(["migrate", "deploy"], { ...PRODUCTION, DATABASE_URL: PROD_URL }, noLoad)).toBe("production");
    expect(noLoad).not.toHaveBeenCalled();
  });

  it("allows only migrate deploy/status against production, without loading env files", () => {
    const env = { ...DEVELOPMENT, ...MIGRATION_OPERATOR, DIRECT_URL: PROD_URL };
    expect(guardPrismaCli(["migrate", "deploy"], env, noLoad)).toBe("production-migration");
    expect(guardPrismaCli(["migrate", "status"], env, noLoad)).toBe("production-migration");
    expect(noLoad).not.toHaveBeenCalled();
  });

  it.each([["migrate", "dev"], ["migrate", "reset", "--force"], ["db", "push"], ["db", "seed"], ["db", "execute", "--stdin"], ["studio"]])(
    "refuses prisma %s %s in production migration mode",
    (...args) => {
      expect(() => guardPrismaCli(args, { ...DEVELOPMENT, ...MIGRATION_OPERATOR, DIRECT_URL: PROD_URL }, noLoad)).toThrow(
        /only allows "migrate deploy" and "migrate status"/
      );
    }
  );

  it("refuses production migration mode against a non-production database", () => {
    expect(() => guardPrismaCli(["migrate", "deploy"], { ...DEVELOPMENT, ...MIGRATION_OPERATOR, DIRECT_URL: DEV_URL }, noLoad)).toThrow(
      /identify the production database/
    );
  });

  it("refuses production migration mode in preview and test", () => {
    expect(() => guardPrismaCli(["migrate", "deploy"], { ...PREVIEW, ...MIGRATION_OPERATOR, DIRECT_URL: PROD_URL }, noLoad)).toThrow(/preview/);
    expect(() => guardPrismaCli(["migrate", "deploy"], { NODE_ENV: "test", ...MIGRATION_OPERATOR, DIRECT_URL: PROD_URL }, noLoad)).toThrow(/test/);
  });

  it("requires both operator markers; one alone falls back to the normal guard", () => {
    expect(() =>
      guardPrismaCli(["migrate", "deploy"], { ...DEVELOPMENT, FIDELIS_PRODUCTION_OPERATOR: "migrate-production", DATABASE_URL: PROD_URL }, noLoad)
    ).toThrow(/PRODUCTION database/);
    expect(() =>
      guardPrismaCli(["migrate", "deploy"], { ...DEVELOPMENT, FIDELIS_PRODUCTION_MIGRATION_CONFIRMED: "true", DATABASE_URL: PROD_URL }, noLoad)
    ).toThrow(/PRODUCTION database/);
  });

  it("migrate-production passes the confirmation marker to its Prisma child process", () => {
    const source = readFileSync(resolve(root, "scripts/migrate-production.ts"), "utf8");
    expect(source).toContain('FIDELIS_PRODUCTION_MIGRATION_CONFIRMED: "true"');
  });
});

describe("prisma.config.ts wiring", () => {
  it("runs the guard on load and defines the seed command", () => {
    const source = readFileSync(resolve(root, "prisma.config.ts"), "utf8");
    expect(source).toMatch(/^guardPrismaCli\(\);$/m);
    expect(source).toContain('seed: "tsx prisma/seed.ts"');
  });

  it("package.json no longer carries the ignored prisma seed block", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.prisma).toBeUndefined();
  });
});
