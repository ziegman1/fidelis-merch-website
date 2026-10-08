/**
 * Guarded synthetic development seed. Development only; never production.
 *
 *   npm run db:seed:dev -- --confirm-synthetic-dev-seed
 *
 * Refuses unless: the confirmation flag is present, the environment is
 * "development", every database URL passes assertDatabaseAllowed and matches
 * DEVELOPMENT_DATABASE_FINGERPRINTS, every repository migration is applied, and
 * the database holds no application data other than this canonical seed.
 * Writes the whole dataset in one transaction by fixed id, so re-runs restore
 * the canonical state without duplicating anything.
 */
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prepareScriptEnvironment } from "./lib/script-env";
import { assertApprovedDevelopmentDatabase } from "../src/lib/env-safety";
import { buildDevSeedRows, type DevSeedRows } from "./lib/dev-seed-data";

export const CONFIRM_FLAG = "--confirm-synthetic-dev-seed";
const SCRIPT_NAME = "seed-development";
const DEFAULT_MIGRATIONS_DIR = resolve(__dirname, "../prisma/migrations");

type Env = Record<string, string | undefined>;
type Tx = Prisma.TransactionClient;
export type TableCounts = Record<string, number>;

export class DevSeedRefusedError extends Error {
  constructor(message: string) {
    super(`[${SCRIPT_NAME}] Refused; nothing was written. ${message}`);
    this.name = "DevSeedRefusedError";
  }
}

export type DevSeedOptions = {
  argv?: readonly string[];
  env?: Env;
  prepareEnvironment?: () => void;
  getDb?: () => PrismaClient | Promise<PrismaClient>;
  migrationsDir?: string;
};

export type DevSeedSummary = { created: TableCounts; updated: TableCounts; total: TableCounts };

export function listRepositoryMigrations(dir: string = DEFAULT_MIGRATIONS_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(dir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();
}

type MigrationRow = { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null };

export async function assertMigrationState(db: PrismaClient, expected: string[]): Promise<void> {
  let rows: MigrationRow[];
  try {
    rows = await db.$queryRaw<MigrationRow[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
  } catch (e) {
    if (e instanceof Error && e.name === "EnvironmentSafetyError") throw e;
    throw new DevSeedRefusedError("Could not read _prisma_migrations; apply migrations with npm run db:migrate:deploy first.");
  }
  const incomplete = rows.filter((r) => !r.finished_at || r.rolled_back_at);
  const applied = rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name).sort();
  const missing = expected.filter((m) => !applied.includes(m));
  const unexpected = applied.filter((m) => !expected.includes(m));
  const duplicates = applied.length - new Set(applied).size;
  if (incomplete.length || missing.length || unexpected.length || duplicates) {
    throw new DevSeedRefusedError(
      `Migration state does not match the repository (expected ${expected.length}, applied ${applied.length}, ` +
        `missing ${missing.length}, unexpected ${unexpected.length}, incomplete or rolled back ${incomplete.length}, duplicates ${duplicates}).`
    );
  }
}

const MUST_BE_EMPTY = {
  User: (tx: Tx) => tx.user.count(),
  Account: (tx: Tx) => tx.account.count(),
  Session: (tx: Tx) => tx.session.count(),
  VerificationToken: (tx: Tx) => tx.verificationToken.count(),
  ProviderSetting: (tx: Tx) => tx.providerSetting.count(),
  DefaultFulfillmentAddress: (tx: Tx) => tx.defaultFulfillmentAddress.count(),
  PendingCheckoutCart: (tx: Tx) => tx.pendingCheckoutCart.count(),
  Order: (tx: Tx) => tx.order.count(),
  OrderItem: (tx: Tx) => tx.orderItem.count(),
  Fulfillment: (tx: Tx) => tx.fulfillment.count(),
  FulfillmentItem: (tx: Tx) => tx.fulfillmentItem.count(),
  Shipment: (tx: Tx) => tx.shipment.count(),
  PageView: (tx: Tx) => tx.pageView.count(),
} as const;

type ExistingSeedIds = Record<string, Set<string>>;

/**
 * Reads every application table. Anything that is not a canonical seed row is
 * unexpected; rows that would collide with a seed unique key are reported too.
 * Returns the canonical ids already present so the caller can report updates.
 */
export async function inspectExistingData(tx: Tx, rows: DevSeedRows): Promise<ExistingSeedIds> {
  const ids = (list: { id: string }[]) => new Set(list.map((r) => r.id));
  const canonical = {
    Provider: new Set([rows.provider.id]),
    Collection: ids(rows.collections),
    Product: ids(rows.products),
    ProductVariant: ids(rows.variants),
    Inventory: ids(rows.inventories),
    ExternalProductMapping: ids(rows.externalMappings),
    ProductImage: ids(rows.images),
    ShippingRate: ids(rows.shippingRates),
  };
  const pairKey = (r: { productId: string; collectionId: string }) => `${r.productId}|${r.collectionId}`;
  const canonicalPairs = new Set(rows.productCollections.map(pairKey));
  const productSlugs = new Set(rows.products.map((p) => p.slug));
  const collectionSlugs = new Set(rows.collections.map((c) => c.slug));
  const zoneTypes = new Set(rows.shippingRates.map((r) => r.zoneType));
  const mappingPairs = new Set(rows.externalMappings.map((m) => `${m.productId}|${m.productVariantId}`));

  const providers = await tx.provider.findMany({ select: { id: true, slug: true } });
  const collections = await tx.collection.findMany({ select: { id: true, slug: true } });
  const products = await tx.product.findMany({ select: { id: true, slug: true } });
  const variants = await tx.productVariant.findMany({ select: { id: true } });
  const inventories = await tx.inventory.findMany({ select: { id: true, variantId: true } });
  const mappings = await tx.externalProductMapping.findMany({ select: { id: true, productId: true, productVariantId: true } });
  const images = await tx.productImage.findMany({ select: { id: true } });
  const links = await tx.productCollection.findMany({ select: { productId: true, collectionId: true } });
  const rates = await tx.shippingRate.findMany({ select: { id: true, zoneType: true } });

  const unexpected: TableCounts = {};
  const collisions: TableCounts = {};
  const tally = (table: string, list: { id: string }[], collides: (r: never) => boolean = () => false) => {
    const others = list.filter((r) => !canonical[table as keyof typeof canonical].has(r.id));
    if (others.length) unexpected[table] = others.length;
    const clashing = others.filter((r) => collides(r as never)).length;
    if (clashing) collisions[table] = clashing;
  };
  tally("Provider", providers, (r: { slug: string }) => r.slug === rows.provider.slug);
  tally("Collection", collections, (r: { slug: string }) => collectionSlugs.has(r.slug));
  tally("Product", products, (r: { slug: string }) => productSlugs.has(r.slug));
  tally("ProductVariant", variants);
  tally("Inventory", inventories, (r: { variantId: string }) => canonical.ProductVariant.has(r.variantId));
  tally("ExternalProductMapping", mappings, (r: { productId: string; productVariantId: string }) =>
    mappingPairs.has(`${r.productId}|${r.productVariantId}`)
  );
  tally("ProductImage", images);
  tally("ShippingRate", rates, (r: { zoneType: string }) => zoneTypes.has(r.zoneType));
  const strayLinks = links.filter((l) => !canonicalPairs.has(pairKey(l))).length;
  if (strayLinks) unexpected.ProductCollection = strayLinks;

  for (const [table, count] of Object.entries(MUST_BE_EMPTY)) {
    const n = await count(tx);
    if (n > 0) unexpected[table] = n;
  }

  if (Object.keys(unexpected).length) {
    const fmt = (c: TableCounts) => Object.entries(c).map(([t, n]) => `${t}=${n}`).join(", ");
    throw new DevSeedRefusedError(
      `Unexpected existing application data: ${fmt(unexpected)}.` +
        (Object.keys(collisions).length ? ` Unique key collisions with seed records: ${fmt(collisions)}.` : "")
    );
  }

  const present = (table: keyof typeof canonical, list: { id: string }[]) =>
    new Set(list.map((r) => r.id).filter((id) => canonical[table].has(id)));
  return {
    Provider: present("Provider", providers),
    Collection: present("Collection", collections),
    Product: present("Product", products),
    ProductVariant: present("ProductVariant", variants),
    Inventory: present("Inventory", inventories),
    ExternalProductMapping: present("ExternalProductMapping", mappings),
    ProductImage: present("ProductImage", images),
    ProductCollection: new Set(links.map(pairKey)),
    ShippingRate: present("ShippingRate", rates),
  };
}

export async function writeSeedRows(tx: Tx, rows: DevSeedRows): Promise<void> {
  const { id: providerId, ...provider } = rows.provider;
  await tx.provider.upsert({ where: { id: providerId }, create: rows.provider, update: provider });

  for (const { id, ...data } of rows.collections) {
    await tx.collection.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of rows.products) {
    const full = { ...data, colorOrder: Prisma.DbNull };
    await tx.product.upsert({ where: { id }, create: { id, ...full }, update: full });
  }
  for (const { id, ...data } of rows.variants) {
    await tx.productVariant.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of rows.inventories) {
    await tx.inventory.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of rows.externalMappings) {
    await tx.externalProductMapping.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of rows.images) {
    const full = { ...data, variantIds: Prisma.DbNull };
    await tx.productImage.upsert({ where: { id }, create: { id, ...full }, update: full });
  }
  for (const link of rows.productCollections) {
    await tx.productCollection.upsert({ where: { productId_collectionId: link }, create: link, update: {} });
  }
  for (const { id, ...data } of rows.shippingRates) {
    await tx.shippingRate.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}

function summarize(rows: DevSeedRows, existing: ExistingSeedIds): DevSeedSummary {
  const tables: [string, string[]][] = [
    ["Provider", [rows.provider.id]],
    ["Collection", rows.collections.map((r) => r.id)],
    ["Product", rows.products.map((r) => r.id)],
    ["ProductVariant", rows.variants.map((r) => r.id)],
    ["Inventory", rows.inventories.map((r) => r.id)],
    ["ExternalProductMapping", rows.externalMappings.map((r) => r.id)],
    ["ProductImage", rows.images.map((r) => r.id)],
    ["ProductCollection", rows.productCollections.map((r) => `${r.productId}|${r.collectionId}`)],
    ["ShippingRate", rows.shippingRates.map((r) => r.id)],
  ];
  const summary: DevSeedSummary = { created: {}, updated: {}, total: {} };
  for (const [table, keys] of tables) {
    const updated = keys.filter((k) => existing[table].has(k)).length;
    summary.total[table] = keys.length;
    summary.updated[table] = updated;
    summary.created[table] = keys.length - updated;
  }
  return summary;
}

export async function runDevelopmentSeed(options: DevSeedOptions = {}): Promise<DevSeedSummary> {
  const argv = options.argv ?? process.argv.slice(2);
  const env = options.env ?? process.env;

  if (argv.includes("--production")) {
    throw new DevSeedRefusedError("--production is not supported; this seed is development-only.");
  }
  if (!argv.includes(CONFIRM_FLAG)) {
    throw new DevSeedRefusedError(`Pass ${CONFIRM_FLAG} to confirm writing synthetic data to the development database.`);
  }

  (options.prepareEnvironment ?? (() => prepareScriptEnvironment(SCRIPT_NAME)))();
  assertApprovedDevelopmentDatabase(env);

  const db = options.getDb ? await options.getDb() : (await import("../src/lib/db")).prisma;
  try {
    await assertMigrationState(db, listRepositoryMigrations(options.migrationsDir));
    const rows = buildDevSeedRows();
    return await db.$transaction(
      async (tx) => {
        const existing = await inspectExistingData(tx, rows);
        await writeSeedRows(tx, rows);
        return summarize(rows, existing);
      },
      { maxWait: 10_000, timeout: 60_000 }
    );
  } finally {
    if (!options.getDb) await db.$disconnect();
  }
}

function safeErrorMessage(e: unknown): string {
  if (e instanceof DevSeedRefusedError) return e.message;
  if (e instanceof Error && e.name === "EnvironmentSafetyError") return `[${SCRIPT_NAME}] Refused; nothing was written. ${e.message}`;
  const name = e instanceof Error ? e.name : "Error";
  const code = (e as { code?: unknown })?.code;
  return `[${SCRIPT_NAME}] Failed (${name}${typeof code === "string" ? ` ${code}` : ""}); the transaction was not committed.`;
}

if (/seed-development\.ts$/.test(process.argv[1] ?? "")) {
  runDevelopmentSeed()
    .then((s) => {
      const fmt = (c: TableCounts) => Object.entries(c).map(([t, n]) => `${t}=${n}`).join(" ");
      console.log(`[${SCRIPT_NAME}] created: ${fmt(s.created)}`);
      console.log(`[${SCRIPT_NAME}] updated: ${fmt(s.updated)}`);
      console.log(`[${SCRIPT_NAME}] canonical totals: ${fmt(s.total)}`);
    })
    .catch((e) => {
      console.error(safeErrorMessage(e));
      process.exitCode = 1;
    });
}
