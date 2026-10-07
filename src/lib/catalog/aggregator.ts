/**
 * Unified catalog: merges products from all sources and provides list / getBySlug / getById.
 * Add new source adapters here when integrating Shopify etc.
 */

import type { UnifiedProduct } from "./types";
import { getPrintifyProductsFromDb } from "./printify-adapter";
import { getManualProductsFromDb } from "./manual-adapter";
import { isFeaturedByConfig } from "@/data/shop-config";
import { slugForUrl } from "@/lib/utils";

export type CatalogFilters = {
  /** Filter by collection (legacy ProductCollection). */
  collectionSlug?: string;
  /** Filter by category tag: "apparel" | "drinkware". */
  categorySlug?: string;
  /** Filter featured items (tag or Product.featured). */
  featured?: boolean;
  q?: string;
};

/**
 * Returns all active products from all sources, normalized and merged.
 * Optionally filter by collection (DB collections apply to DB products only for now).
 */
export async function listUnifiedProducts(
  filters: CatalogFilters = {}
): Promise<UnifiedProduct[]> {
  const [printify, manual] = await Promise.all([
    getPrintifyProductsFromDb(),
    getManualProductsFromDb(),
  ]);

  const bySlug = new Map<string, UnifiedProduct>();
  for (const p of [...printify, ...manual]) {
    if (p.active && !bySlug.has(p.slug)) bySlug.set(p.slug, p);
  }
  let list = Array.from(bySlug.values());

  // Apply featured override from config (hoodie, polo, etc.)
  for (const p of list) {
    if (!p.featured && isFeaturedByConfig(p.slug)) {
      (p as UnifiedProduct).featured = true;
    }
  }

  if (filters.featured) {
    list = list.filter((p) => p.featured);
  }
  if (filters.categorySlug) {
    list = list.filter((p) => p.category === filters.categorySlug);
  }
  if (filters.q?.trim()) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters.collectionSlug) {
    const collectionProductSlugs = await getCollectionProductSlugs(
      filters.collectionSlug
    );
    if (collectionProductSlugs.size > 0) {
      list = list.filter((p) => collectionProductSlugs.has(p.slug));
    }
  }

  list.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return list;
}

async function getCollectionProductSlugs(
  collectionSlug: string
): Promise<Set<string>> {
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.productCollection.findMany({
    where: {
      collection: { slug: collectionSlug },
      product: { status: "PUBLISHED" },
    },
    select: { product: { select: { slug: true } } },
  });
  return new Set(rows.map((r) => r.product.slug));
}

/**
 * Fetch a single product by slug from the unified catalog.
 * - Normalizes spaces to hyphens (e.g. "water bottle" → "water-bottle")
 * - Falls back to prefix match for Printify products (e.g. "fidelis-laser-water-bottle" matches "fidelis-laser-water-bottle-abc12345")
 */
export async function getUnifiedProductBySlug(
  slug: string
): Promise<UnifiedProduct | null> {
  const list = await listUnifiedProducts({});
  const normalized = slugForUrl(slug);

  const exact = list.find(
    (p) =>
      p.slug === slug ||
      p.slug === normalized ||
      slugForUrl(p.slug) === normalized
  );
  if (exact) return exact;

  // Fallback: Printify adds suffix like -abc12345; match slug that starts with requested + "-"
  const prefix = `${normalized}-`;
  const byPrefix = list.filter(
    (p) => p.slug.startsWith(prefix) || slugForUrl(p.slug).startsWith(prefix)
  );
  return byPrefix.length === 1 ? byPrefix[0]! : byPrefix[0] ?? null;
}

/**
 * Fetch a single product by id from the unified catalog.
 */
export async function getUnifiedProductById(
  id: string
): Promise<UnifiedProduct | null> {
  const list = await listUnifiedProducts({});
  return list.find((p) => p.id === id) ?? null;
}
