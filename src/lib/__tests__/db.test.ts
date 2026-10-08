import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  constructed: 0,
  findUnique: (() => {}) as (...args: unknown[]) => unknown,
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    m.constructed += 1;
    this.user = { findUnique: (...args: unknown[]) => m.findUnique(...args) };
    this.$transaction = function (this: unknown) {
      return Promise.resolve(this);
    };
  }),
}));

const PROD_REF = "zyxwvutsrqponmlkjihg";
const DEV_REF = "abcdefghijklmnopqrst";
const PROD_URL = `postgresql://postgres.${PROD_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
const DEV_URL = `postgresql://postgres.${DEV_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
const PROD_FINGERPRINT = createHash("sha256").update(`supabase:${PROD_REF}`).digest("hex");

const DB_KEYS = ["DATABASE_URL", "DIRECT_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED"];
const savedEnv = { ...process.env };
const g = globalThis as unknown as { prisma?: unknown };
const savedGlobalPrisma = g.prisma;

function setEnv(vars: Record<string, string | undefined>) {
  for (const key of [...DB_KEYS, "VITEST", "NODE_ENV", "VERCEL_ENV"]) delete process.env[key];
  for (const [key, value] of Object.entries(vars)) if (value !== undefined) process.env[key] = value;
}

const DEVELOPMENT = { NODE_ENV: "development" };
const PREVIEW = { VERCEL_ENV: "preview", NODE_ENV: "production" };
const PRODUCTION = { VERCEL_ENV: "production", NODE_ENV: "production" };

async function loadDb() {
  const envSafety = await import("@/lib/env-safety");
  (envSafety.PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).add(PROD_FINGERPRINT);
  return import("@/lib/db");
}

beforeEach(() => {
  vi.resetModules();
  delete g.prisma;
  m.constructed = 0;
  m.findUnique = vi.fn().mockResolvedValue(null);
});

afterEach(() => {
  process.env = { ...savedEnv };
  if (savedGlobalPrisma === undefined) delete g.prisma;
  else g.prisma = savedGlobalPrisma;
});

describe("importing db.ts", () => {
  it("succeeds without DATABASE_URL and does not create a Prisma client", async () => {
    setEnv(DEVELOPMENT);
    const { prisma } = await loadDb();
    expect(prisma).toBeDefined();
    expect(m.constructed).toBe(0);
    expect(g.prisma).toBeUndefined();
  });

  it("does not validate or create a client even when DATABASE_URL is production", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: PROD_URL });
    await expect(loadDb()).resolves.toBeDefined();
    expect(m.constructed).toBe(0);
  });
});

describe("first database use runs the existing safety check before Prisma exists", () => {
  it("fails closed when credentials are missing in development", async () => {
    setEnv(DEVELOPMENT);
    const { prisma } = await loadDb();
    expect(() => prisma.user).toThrow(/DATABASE_URL is not set/);
    expect(m.constructed).toBe(0);
    expect(g.prisma).toBeUndefined();
  });

  it("fails closed for a production database in development", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: PROD_URL });
    const { prisma } = await loadDb();
    expect(() => prisma.user.findUnique({ where: { id: "x" } })).toThrow(/PRODUCTION database/);
    expect(() => prisma.$transaction([])).toThrow(/PRODUCTION database/);
    expect(m.constructed).toBe(0);
    expect(m.findUnique).not.toHaveBeenCalled();
  });

  it("fails closed for a production DIRECT_URL in development", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: PROD_URL });
    const { prisma } = await loadDb();
    expect(() => prisma.user).toThrow(/DIRECT_URL points at the PRODUCTION database/);
    expect(m.constructed).toBe(0);
  });

  it("fails closed for a production database in Preview", async () => {
    setEnv({ ...PREVIEW, DATABASE_URL: PROD_URL });
    const { prisma } = await loadDb();
    expect(() => prisma.user).toThrow(/PRODUCTION database in the "preview" environment/);
    expect(m.constructed).toBe(0);
  });

  it("fails closed for missing credentials in Preview", async () => {
    setEnv(PREVIEW);
    const { prisma } = await loadDb();
    expect(() => prisma.user).toThrow(/DATABASE_URL is not set for the "preview" environment/);
    expect(m.constructed).toBe(0);
  });

  it("keeps refusing on every later use after a refusal", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: PROD_URL });
    const { prisma } = await loadDb();
    expect(() => prisma.user).toThrow(/PRODUCTION database/);
    expect(() => prisma.user).toThrow(/PRODUCTION database/);
    expect(m.constructed).toBe(0);
  });
});

describe("permitted databases", () => {
  it("allows a safe development database and keeps one client per process", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: DEV_URL });
    const { prisma } = await loadDb();
    await prisma.user.findUnique({ where: { id: "x" } });
    await prisma.user.findUnique({ where: { id: "y" } });
    expect(m.constructed).toBe(1);
    expect(m.findUnique).toHaveBeenCalledTimes(2);
    expect(g.prisma).toBeDefined();

    vi.resetModules();
    const reloaded = await loadDb();
    await reloaded.prisma.user.findUnique({ where: { id: "z" } });
    expect(m.constructed).toBe(1);
  });

  it("binds client methods to the real client", async () => {
    setEnv({ ...DEVELOPMENT, DATABASE_URL: DEV_URL });
    const { prisma } = await loadDb();
    const self = await prisma.$transaction([]);
    expect(self).toBe(g.prisma);
  });

  it("does not cache the client on globalThis in production", async () => {
    setEnv({ ...PRODUCTION, DATABASE_URL: PROD_URL });
    const { prisma } = await loadDb();
    await prisma.user.findUnique({ where: { id: "x" } });
    await prisma.user.findUnique({ where: { id: "y" } });
    expect(m.constructed).toBe(1);
    expect(g.prisma).toBeUndefined();
  });
});
