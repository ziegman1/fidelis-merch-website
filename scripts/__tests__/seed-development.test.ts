import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const integrationImports = vi.hoisted(() => [] as string[]);
vi.mock("stripe", () => {
  integrationImports.push("stripe");
  return { default: vi.fn() };
});
vi.mock("resend", () => {
  integrationImports.push("resend");
  return { Resend: vi.fn() };
});
vi.mock("@vercel/blob", () => {
  integrationImports.push("@vercel/blob");
  return { put: vi.fn() };
});

import { CONFIRM_FLAG, listRepositoryMigrations, runDevelopmentSeed, type DevSeedOptions } from "../seed-development";
import { buildDevSeedRows, DEV_SEED_IMAGE_URL, DEV_SEED_NOTICE, DEV_SEED_TAG } from "../lib/dev-seed-data";
import { DEVELOPMENT_DATABASE_FINGERPRINTS, PRODUCTION_DATABASE_FINGERPRINTS } from "../../src/lib/env-safety";

const root = resolve(__dirname, "../..");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const FAKE_DEV_REF = "seedseedseedseedseed";
const FAKE_PROD_REF = "prodprodprodprodprod";
const FAKE_DEV_FINGERPRINT = sha(`supabase:${FAKE_DEV_REF}`);
const FAKE_PROD_FINGERPRINT = sha(`supabase:${FAKE_PROD_REF}`);
// Unreachable hosts; identity comes from the pooler username.
const APPROVED_DEV_URL = `postgresql://postgres.${FAKE_DEV_REF}:pw@127.0.0.1:1/postgres`;
const PROD_URL = `postgresql://postgres.${FAKE_PROD_REF}:pw@127.0.0.1:1/postgres`;
const OTHER_DEV_URL = "postgresql://dev:dev@127.0.0.1:1/fidelis_dev";
const APPROVED_ENV = { NODE_ENV: "development", DATABASE_URL: APPROVED_DEV_URL, DIRECT_URL: APPROVED_DEV_URL };

const EXPECTED_MIGRATIONS = listRepositoryMigrations();

// ——— In-memory Prisma stand-in: no database, writes only inside $transaction ———

const MODELS = [
  "provider", "collection", "product", "productVariant", "inventory", "externalProductMapping", "productImage",
  "productCollection", "shippingRate", "user", "account", "session", "verificationToken", "providerSetting",
  "defaultFulfillmentAddress", "pendingCheckoutCart", "order", "orderItem", "fulfillment", "fulfillmentItem",
  "shipment", "pageView",
] as const;
type Model = (typeof MODELS)[number];
type Row = Record<string, unknown>;
type MigrationRow = { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null };

const keyOfRow = (m: Model, r: Row) =>
  m === "productCollection" ? `${r.productId}|${r.collectionId}` : String(r.id);
const keyOfWhere = (m: Model, where: Row) =>
  m === "productCollection" ? keyOfRow(m, where.productId_collectionId as Row) : String(where.id);

const appliedMigrations = (names = EXPECTED_MIGRATIONS): MigrationRow[] =>
  names.map((migration_name) => ({ migration_name, finished_at: new Date(0), rolled_back_at: null }));

function createFakeDb(opts: { tables?: Partial<Record<Model, Row[]>>; migrations?: MigrationRow[] | "missing" } = {}) {
  const store = Object.fromEntries(MODELS.map((m) => [m, new Map<string, Row>()])) as Record<Model, Map<string, Row>>;
  for (const [m, rows] of Object.entries(opts.tables ?? {}) as [Model, Row[]][]) {
    for (const r of rows) store[m].set(keyOfRow(m, r), { ...r });
  }
  let inTransaction = false;
  const stats = { transactions: 0, writes: 0, writesOutsideTransaction: 0 };
  const model = (m: Model) => ({
    findMany: async () => [...store[m].values()].map((r) => ({ ...r })),
    count: async () => store[m].size,
    upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
      if (!inTransaction) {
        stats.writesOutsideTransaction++;
        throw new Error("write outside transaction");
      }
      stats.writes++;
      const key = keyOfWhere(m, where);
      const existing = store[m].get(key);
      store[m].set(key, existing ? { ...existing, ...update } : { ...create });
    },
  });
  const client = Object.fromEntries(MODELS.map((m) => [m, model(m)]));
  const db = {
    ...client,
    $queryRaw: async () => {
      if (opts.migrations === "missing") throw new Error('relation "_prisma_migrations" does not exist');
      return opts.migrations ?? appliedMigrations();
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      stats.transactions++;
      const snapshot = new Map(MODELS.map((m) => [m, new Map(store[m])]));
      inTransaction = true;
      try {
        return await fn(client);
      } catch (e) {
        for (const m of MODELS) store[m] = snapshot.get(m)!;
        throw e;
      } finally {
        inTransaction = false;
      }
    },
    $disconnect: async () => {},
  };
  const snapshot = () =>
    Object.fromEntries(MODELS.map((m) => [m, Object.fromEntries([...store[m]].map(([k, r]) => [k, { ...r }]))]));
  const sizes = () => Object.fromEntries(MODELS.map((m) => [m, store[m].size]));
  return { db: db as unknown as PrismaClient, store, stats, snapshot, sizes };
}

const run = (fake: ReturnType<typeof createFakeDb>, overrides: Partial<DevSeedOptions> = {}) =>
  runDevelopmentSeed({
    argv: [CONFIRM_FLAG],
    env: APPROVED_ENV,
    prepareEnvironment: () => {},
    getDb: () => fake.db,
    ...overrides,
  });

beforeEach(() => {
  integrationImports.length = 0;
  (DEVELOPMENT_DATABASE_FINGERPRINTS as Set<string>).add(FAKE_DEV_FINGERPRINT);
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).add(FAKE_PROD_FINGERPRINT);
});

afterEach(() => {
  (DEVELOPMENT_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_DEV_FINGERPRINT);
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_PROD_FINGERPRINT);
  vi.restoreAllMocks();
});

describe("target database and environment gates", () => {
  async function expectRefusedBeforeConnecting(overrides: Partial<DevSeedOptions>, message: RegExp) {
    const fake = createFakeDb();
    const getDb = vi.fn(() => fake.db);
    await expect(run(fake, { getDb, ...overrides })).rejects.toThrow(message);
    expect(getDb).not.toHaveBeenCalled();
    expect(fake.stats.writes).toBe(0);
  }

  it("refuses the production database", async () => {
    await expectRefusedBeforeConnecting({ env: { ...APPROVED_ENV, DATABASE_URL: PROD_URL } }, /PRODUCTION database/);
    await expectRefusedBeforeConnecting({ env: { ...APPROVED_ENV, DIRECT_URL: PROD_URL } }, /DIRECT_URL points at the PRODUCTION database/);
  });

  it("refuses an unidentified database", async () => {
    await expectRefusedBeforeConnecting({ env: { ...APPROVED_ENV, DATABASE_URL: "not-a-url" } }, /cannot be identified/);
    await expectRefusedBeforeConnecting(
      { env: { ...APPROVED_ENV, DATABASE_URL: "postgresql://postgres:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres" } },
      /cannot be identified/
    );
  });

  it("refuses missing credentials", async () => {
    await expectRefusedBeforeConnecting({ env: { NODE_ENV: "development" } }, /DATABASE_URL is not set/);
  });

  it("refuses an identifiable development database that is not allowlisted", async () => {
    await expectRefusedBeforeConnecting(
      { env: { NODE_ENV: "development", DATABASE_URL: OTHER_DEV_URL, DIRECT_URL: OTHER_DEV_URL } },
      /DATABASE_URL is not an approved development database/
    );
    await expectRefusedBeforeConnecting(
      { env: { ...APPROVED_ENV, DIRECT_URL: OTHER_DEV_URL } },
      /DIRECT_URL is not an approved development database/
    );
  });

  it("permits only the allowlisted database, and the allowlist holds the verified fidelis-merch-dev fingerprint", async () => {
    expect(DEVELOPMENT_DATABASE_FINGERPRINTS.has("a7979765f6ea614874d4ddde2ee04e4fa7f14c95de6c9d19d01f18b19e31c796")).toBe(true);
    const fake = createFakeDb();
    await expect(run(fake)).resolves.toBeDefined();
    expect(fake.stats.writes).toBeGreaterThan(0);
  });

  it("refuses without the confirmation flag, before preparing the environment", async () => {
    const prepareEnvironment = vi.fn();
    await expectRefusedBeforeConnecting({ argv: [], prepareEnvironment }, /--confirm-synthetic-dev-seed/);
    await expectRefusedBeforeConnecting({ argv: ["--confirm"], prepareEnvironment }, /--confirm-synthetic-dev-seed/);
    expect(prepareEnvironment).not.toHaveBeenCalled();
  });

  it("refuses --production outright", async () => {
    await expectRefusedBeforeConnecting({ argv: [CONFIRM_FLAG, "--production"] }, /--production is not supported/);
  });

  it.each([
    ["preview", { VERCEL_ENV: "preview", NODE_ENV: "production" }],
    ["production", { VERCEL_ENV: "production", NODE_ENV: "production" }],
    ["test", { NODE_ENV: "test" }],
    ["vitest", { VITEST: "true" }],
  ])("refuses the %s environment even with the allowlisted database", async (_label, base) => {
    await expectRefusedBeforeConnecting(
      { env: { ...base, DATABASE_URL: APPROVED_DEV_URL, DIRECT_URL: APPROVED_DEV_URL } },
      /only runs in the "development" environment/
    );
  });

  it("uses the existing 0B-1 preparation and the guarded lazy Prisma client by default", () => {
    const source = readFileSync(resolve(root, "scripts/seed-development.ts"), "utf8");
    expect(source).toContain("prepareScriptEnvironment(SCRIPT_NAME)");
    expect(source).not.toContain("allowProductionOperator");
    expect(source).not.toContain("enableProductionOperatorMode");
    expect(source).toContain('(await import("../src/lib/db")).prisma');
    expect(source).not.toMatch(/new PrismaClient/);
  });
});

describe("migration state", () => {
  const cases: [string, MigrationRow[] | "missing"][] = [
    ["a missing migration", appliedMigrations(EXPECTED_MIGRATIONS.slice(1))],
    ["an unexpected extra migration", appliedMigrations([...EXPECTED_MIGRATIONS, "20990101000000_add_site_copy"])],
    ["a rolled back migration", appliedMigrations().map((r, i) => (i === 3 ? { ...r, rolled_back_at: new Date(0) } : r))],
    ["an unfinished migration", appliedMigrations().map((r, i) => (i === 5 ? { ...r, finished_at: null } : r))],
    ["a missing migrations table", "missing"],
  ];
  it.each(cases)("refuses %s without writing", async (_label, migrations) => {
    const fake = createFakeDb({ migrations });
    await expect(run(fake)).rejects.toThrow(/Refused; nothing was written/);
    expect(fake.stats.transactions).toBe(0);
    expect(fake.stats.writes).toBe(0);
  });

  it("expects all 14 committed migrations", () => {
    expect(EXPECTED_MIGRATIONS).toHaveLength(14);
    expect(EXPECTED_MIGRATIONS.some((m) => m.includes("site_copy"))).toBe(false);
  });
});

describe("existing data", () => {
  it.each([
    ["Order", "order", { id: "order_1" }],
    ["PendingCheckoutCart", "pendingCheckoutCart", { id: "pcc_1" }],
    ["PageView", "pageView", { id: "pv_1" }],
    ["User", "user", { id: "user_1" }],
    ["DefaultFulfillmentAddress", "defaultFulfillmentAddress", { id: "dfa_1" }],
    ["Fulfillment", "fulfillment", { id: "f_1" }],
    ["Product", "product", { id: "clx_other_product", slug: "some-other-product" }],
    ["ProductVariant", "productVariant", { id: "clx_other_variant" }],
    ["Product", "product", { id: "dev_seed_product_retired", slug: "dev-synthetic-retired" }],
  ] as const)("refuses unexpected %s rows and reports table counts", async (table, model, row) => {
    const fake = createFakeDb({ tables: { [model]: [row] } });
    const before = fake.snapshot();
    await expect(run(fake)).rejects.toThrow(new RegExp(`Unexpected existing application data: .*${table}=1`));
    expect(fake.stats.writes).toBe(0);
    expect(fake.snapshot()).toEqual(before);
  });

  it("refuses and reports unique key collisions with non-seed records", async () => {
    const fake = createFakeDb({
      tables: {
        product: [{ id: "clx_real_mug", slug: "dev-synthetic-mug" }],
        provider: [{ id: "clx_real_provider", slug: "printify" }],
        shippingRate: [{ id: "clx_real_rate", zoneType: "domestic_us" }],
        collection: [{ id: "clx_real_collection", slug: "dev-apparel" }],
      },
    });
    await expect(run(fake)).rejects.toThrow(
      /Unique key collisions with seed records: Provider=1, Collection=1, Product=1, ShippingRate=1/
    );
    expect(fake.stats.writes).toBe(0);
  });
});

describe("writes and idempotency", () => {
  it("creates the full canonical dataset in a single transaction and leaves every other table empty", async () => {
    const fake = createFakeDb();
    const summary = await run(fake);
    expect(fake.stats.transactions).toBe(1);
    expect(fake.stats.writesOutsideTransaction).toBe(0);
    expect(summary.created).toEqual({
      Provider: 1, Collection: 2, Product: 7, ProductVariant: 15, Inventory: 7,
      ExternalProductMapping: 7, ProductImage: 7, ProductCollection: 4, ShippingRate: 2,
    });
    expect(Object.values(summary.updated).every((n) => n === 0)).toBe(true);
    for (const m of ["user", "account", "session", "verificationToken", "providerSetting", "defaultFulfillmentAddress",
      "pendingCheckoutCart", "order", "orderItem", "fulfillment", "fulfillmentItem", "shipment", "pageView"] as const) {
      expect(fake.store[m].size, m).toBe(0);
    }
  });

  it("is deterministic", async () => {
    expect(buildDevSeedRows()).toEqual(buildDevSeedRows());
    const a = createFakeDb();
    const b = createFakeDb();
    await run(a);
    await run(b);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it("re-running against only canonical seed data is safe and creates no duplicates", async () => {
    const fake = createFakeDb();
    const first = await run(fake);
    const afterFirst = fake.snapshot();
    const sizesAfterFirst = fake.sizes();
    const second = await run(fake);
    expect(fake.sizes()).toEqual(sizesAfterFirst);
    expect(fake.snapshot()).toEqual(afterFirst);
    expect(Object.values(second.created).every((n) => n === 0)).toBe(true);
    expect(second.updated).toEqual(first.created);
  });

  it("restores canonical values that drifted since the last run", async () => {
    const fake = createFakeDb();
    await run(fake);
    const canonical = fake.snapshot();
    fake.store.inventory.get("dev_seed_inventory_sticker_pack_default")!.quantity = 0;
    fake.store.product.get("dev_seed_product_cap")!.comingSoon = false;
    fake.store.shippingRate.get("dev_seed_rate_domestic_us")!.priceCents = 1;
    await run(fake);
    expect(fake.snapshot()).toEqual(canonical);
  });

  it("never imports Stripe, Resend or Blob at runtime", async () => {
    await run(createFakeDb());
    expect(integrationImports).toEqual([]);
  });
});

describe("integration isolation", () => {
  const ALLOWED_PACKAGES = new Set(["node:fs", "node:path", "node:crypto", "@prisma/client", "@next/env"]);
  const FORBIDDEN = /stripe|resend|email|blob|printify|catalog|fulfillment|orders|sync/i;

  function resolveLocal(fromFile: string, spec: string): string | null {
    const base = spec.startsWith("@/") ? resolve(root, "src", spec.slice(2)) : resolve(dirname(fromFile), spec);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")]) {
      if (existsSync(candidate) && candidate.match(/\.tsx?$/)) return candidate;
    }
    return null;
  }

  function importGraph(entry: string) {
    const files = new Set<string>();
    const packages = new Set<string>();
    const visit = (file: string) => {
      if (files.has(file)) return;
      files.add(file);
      const source = readFileSync(file, "utf8");
      for (const [, spec] of source.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)) {
        if (spec.startsWith(".") || spec.startsWith("@/")) {
          const target = resolveLocal(file, spec);
          if (!target) throw new Error(`Unresolved import ${spec} in ${file}`);
          visit(target);
        } else {
          packages.add(spec);
        }
      }
    };
    visit(entry);
    return { files: [...files].map((f) => f.slice(root.length + 1)), packages: [...packages] };
  }

  it("the seed's full import graph contains no integration, sync or catalog module", () => {
    const { files, packages } = importGraph(resolve(root, "scripts/seed-development.ts"));
    expect(files.sort()).toEqual([
      "scripts/lib/dev-seed-data.ts",
      "scripts/lib/script-env.ts",
      "scripts/seed-development.ts",
      "src/lib/db.ts",
      "src/lib/env-safety.ts",
    ]);
    for (const file of files) expect(file).not.toMatch(FORBIDDEN);
    for (const pkg of packages) expect(ALLOWED_PACKAGES.has(pkg), pkg).toBe(true);
  });

  it("is wired as an explicit npm script and Prisma has no automatic seed hook", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["db:seed:dev"]).toBe("tsx scripts/seed-development.ts");
    expect(readFileSync(resolve(root, "prisma.config.ts"), "utf8")).not.toMatch(/\bseed\s*:\s*["'`]/);
  });
});

describe("legacy prisma/seed.ts", () => {
  it("refuses, writes nothing and points to db:seed:dev", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    await expect(import("../../prisma/seed")).rejects.toThrow("exit 1");
    expect(exit).toHaveBeenCalledWith(1);
    expect(error.mock.calls.flat().join(" ")).toMatch(/retired and inserts nothing.*npm run db:seed:dev -- --confirm-synthetic-dev-seed/);
  });

  it("imports nothing, so it cannot reach a database or integration", () => {
    const source = readFileSync(resolve(root, "prisma/seed.ts"), "utf8");
    expect(source).not.toMatch(/\bimport\b|\brequire\(/);
  });
});

describe("synthetic fixtures", () => {
  const rows = buildDevSeedRows();
  const serialized = JSON.stringify(rows);

  it("contain nothing that looks like customer, order, payment or production data", () => {
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/\b(cs|pi|ch|cus|sk|pk|rk|whsec|price|prod|acct)_[A-Za-z0-9]/);
    expect(serialized).not.toMatch(/\d{3}[-. )]\d{3}[-. ]\d{4}/);
    expect(serialized).not.toMatch(/\d+ [A-Z][a-z]+ (St|Street|Ave|Avenue|Rd|Road|Way|Blvd)\b/);
    expect(serialized).not.toMatch(/fidelismerch\.com|vercel\.app|supabase/i);
  });

  it("are unmistakably synthetic", () => {
    const allIds = [
      rows.provider.id,
      ...rows.collections.map((r) => r.id),
      ...rows.products.map((r) => r.id),
      ...rows.variants.map((r) => r.id),
      ...rows.inventories.map((r) => r.id),
      ...rows.externalMappings.map((r) => r.id),
      ...rows.images.map((r) => r.id),
      ...rows.shippingRates.map((r) => r.id),
    ];
    for (const id of allIds) expect(id).toMatch(/^dev_seed_/);
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const p of rows.products) {
      expect(p.slug).toMatch(/^dev-synthetic-/);
      expect(p.tags).toContain(DEV_SEED_TAG);
      expect(p.description).toContain(DEV_SEED_NOTICE);
    }
    for (const v of rows.variants) expect(v.sku).toMatch(/^DEV-/);
    for (const c of rows.collections) expect(c.slug).toMatch(/^dev-/);
    for (const img of rows.images) expect(img.url).toBe(DEV_SEED_IMAGE_URL);
    expect(existsSync(resolve(root, "public", DEV_SEED_IMAGE_URL.slice(1)))).toBe(true);
  });

  it("use only synthetic Printify identifiers that still satisfy checkout's format check", () => {
    for (const m of rows.externalMappings) {
      expect(m.externalProductId).toMatch(/^dev-synthetic-printify-/);
      expect(m.externalProductId).not.toMatch(/^[0-9a-f]{24}$/);
      expect(m.externalVariantId).toMatch(/^99000\d{4}$/);
      expect(m.externalVariantId).toMatch(/^[1-9]\d*$/);
    }
  });

  it("match the approved store", () => {
    const product = (slug: string) => rows.products.find((p) => p.slug === slug)!;
    const variantsOf = (slug: string) => rows.variants.filter((v) => v.productId === product(slug).id);
    const stock = (variantId: string) => rows.inventories.find((i) => i.variantId === variantId)?.quantity;
    const mapped = (variantId: string) => rows.externalMappings.some((m) => m.productVariantId === variantId);

    expect(rows.products.map((p) => p.slug)).toEqual([
      "dev-synthetic-mug", "dev-synthetic-sticker-pack", "dev-synthetic-flask", "dev-synthetic-cap",
      "dev-synthetic-draft-item", "dev-synthetic-crew-tee", "dev-synthetic-pullover",
    ]);
    expect(rows.provider).toMatchObject({ slug: "printify", type: "PRINTIFY", isActive: true });
    expect(rows.collections.map((c) => c.slug)).toEqual(["dev-apparel", "dev-drinkware"]);
    expect(rows.shippingRates.map((r) => [r.zoneType, r.priceCents])).toEqual([["domestic_us", 599], ["international", 1499]]);

    expect(product("dev-synthetic-mug")).toMatchObject({ status: "PUBLISHED", featured: true, providerId: null });
    expect(variantsOf("dev-synthetic-mug").map((v) => [v.priceCents, stock(v.id)])).toEqual([[1600, 40], [1800, 40]]);
    expect(variantsOf("dev-synthetic-sticker-pack").map((v) => [v.priceCents, stock(v.id)])).toEqual([[500, 3], [600, 0]]);
    expect(product("dev-synthetic-flask")).toMatchObject({ markOutOfStock: true });
    expect(stock(variantsOf("dev-synthetic-flask")[0].id)).toBe(25);
    expect(product("dev-synthetic-cap")).toMatchObject({ comingSoon: true, status: "PUBLISHED" });
    expect(product("dev-synthetic-draft-item")).toMatchObject({ status: "DRAFT", published: false, publishedAt: null });

    const tee = variantsOf("dev-synthetic-crew-tee");
    expect(product("dev-synthetic-crew-tee")).toMatchObject({ fulfillmentType: "dropship", providerId: rows.provider.id, featured: true });
    expect(tee).toHaveLength(7);
    expect(tee.filter((v) => v.printifyAvailable === false).map((v) => v.name)).toEqual(["L Navy"]);
    expect(tee.filter((v) => !v.active).map((v) => v.name)).toEqual(["XS Black"]);
    expect(tee.filter((v) => !mapped(v.id)).map((v) => v.name)).toEqual(["2XL Black"]);
    expect(tee.map((v) => v.priceCents)).toEqual([2500, 2500, 2500, 2700, 2500, 2500, 2700]);
    for (const v of tee) expect(stock(v.id)).toBeUndefined();

    expect(product("dev-synthetic-pullover")).toMatchObject({ fulfillmentType: "dropship", paused: true });
    expect(variantsOf("dev-synthetic-pullover").map((v) => [v.priceCents, mapped(v.id)])).toEqual([[4000, true]]);
  });
});
