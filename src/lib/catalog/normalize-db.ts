/**
 * Normalizes Prisma Product (with variants, images) to UnifiedProduct.
 * Used by both Printify and manual adapters for DB-sourced products.
 */

import type { UnifiedProduct, UnifiedImage, UnifiedVariant, UnifiedVariantOption } from "./types";

export type DbProductWithRelations = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  fulfillmentType: string;
  featured: boolean;
  markOutOfStock?: boolean;
  paused?: boolean;
  comingSoon?: boolean;
  tags?: unknown;
  colorOrder?: unknown;
  primaryImageId?: string | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number; variantIds?: unknown }[];
  variants: {
    id: string;
    name: string | null;
    sku: string | null;
    priceCents: number;
    compareAtCents: number | null;
    options: unknown;
    sortOrder: number;
    imageOverride?: string | null;
    inventory: { quantity: number } | null;
    printifyAvailable?: boolean | null;
    externalMappings: { externalProductId: string; externalVariantId: string }[];
  }[];
};

export function dbProductToUnified(
  p: DbProductWithRelations,
  sourceType: "printify" | "manual",
  fulfillmentType: "print_on_demand" | "in_house",
  sourceProductId: string | null = null
): UnifiedProduct {
  // For in-house: prefer product images when set; else fall back to variant imageOverride
  const variantsWithImages = p.variants.filter(
    (v) => v.imageOverride?.trim()
  );
  const hasProductImages = (p.images?.length ?? 0) > 0;
  const useVariantImages =
    fulfillmentType === "in_house" &&
    !hasProductImages &&
    variantsWithImages.length > 0;

  const images: UnifiedImage[] = useVariantImages
    ? variantsWithImages
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v, i) => ({
          url: v.imageOverride!,
          alt: p.title,
          sortOrder: i,
          optionKey: null as string | null,
          variantIds: null as number[] | null,
          variantId: v.id,
        }))
    : (() => {
        const rawImages = p.images.map((img) => {
          const raw = (img as { variantIds?: unknown }).variantIds;
          const arr = Array.isArray(raw) ? raw.filter((x): x is number => typeof x === "number") : [];
          return {
            url: img.url,
            alt: img.alt,
            sortOrder: img.sortOrder,
            optionKey: null as string | null,
            variantIds: arr.length > 0 ? arr : null,
            id: img.id,
          };
        });
        // Keep product editor order (sortOrder); primary is used separately for product cards
        return rawImages
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((img, i) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: i,
          optionKey: img.optionKey,
          variantIds: img.variantIds,
        }));
      })();

  const variants: UnifiedVariant[] = p.variants.map((v) => {
    const options: UnifiedVariantOption[] = [];
    const opts = v.options as Record<string, string> | null;
    if (opts && typeof opts === "object") {
      for (const [name, value] of Object.entries(opts)) {
        if (value != null) options.push({ name, value: String(value) });
      }
    }
    const qty = v.inventory?.quantity ?? null;
    const printifyAvail = (v as { printifyAvailable?: boolean | null }).printifyAvailable;
    const quantityAvailable =
      fulfillmentType === "in_house"
        ? qty
        : fulfillmentType === "print_on_demand" && printifyAvail === false
          ? 0
          : null;
    return {
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents,
      options,
      sortOrder: v.sortOrder,
      quantityAvailable,
      sourceVariantId: v.externalMappings[0]?.externalVariantId ?? null,
    };
  });

  const optionNames = new Map<string, Set<string>>();
  for (const v of variants) {
    for (const o of v.options) {
      if (!optionNames.has(o.name)) optionNames.set(o.name, new Set());
      optionNames.get(o.name)!.add(o.value);
    }
  }
  const options = Array.from(optionNames.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));

  const minPrice = variants.length
    ? Math.min(...variants.map((v) => v.priceCents))
    : 0;
  const markOutOfStock = p.markOutOfStock === true && fulfillmentType === "in_house";
  const hasStock =
    !markOutOfStock &&
    (fulfillmentType === "print_on_demand"
      ? variants.some((v) => v.quantityAvailable !== 0)
      : variants.some((v) => (v.quantityAvailable ?? 0) > 0));
  const availability = hasStock ? "in_stock" : "out_of_stock";

  const primaryImageUrl = useVariantImages
    ? images[0]?.url ?? null
    : (() => {
        const primaryId = p.primaryImageId?.trim();
        if (!primaryId) return null;
        const img = p.images.find((i) => i.id === primaryId);
        return img?.url ?? null;
      })();

  const rawTags = p.tags;
  const tags = Array.isArray(rawTags)
    ? (rawTags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  const isFeatured = tags.includes("featured") || p.featured;
  const category =
    tags.includes("apparel") ? "apparel"
    : tags.includes("drinkware") ? "drinkware"
    : "uncategorized";

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    shortDescription: p.description ? p.description.slice(0, 160) : null,
    sourceType,
    fulfillmentType,
    sourceProductId,
    category,
    tags,
    basePriceCents: minPrice,
    compareAtPriceCents: variants[0]?.compareAtCents ?? null,
    images,
    options,
    variants,
    availability,
    featured: isFeatured,
    active: true,
    inventoryTracking: fulfillmentType === "in_house",
    metadata: {},
    colorOrder: Array.isArray(p.colorOrder)
      ? (p.colorOrder as string[])
      : null,
    primaryImageUrl: primaryImageUrl ?? undefined,
    markOutOfStock: fulfillmentType === "in_house" ? (p.markOutOfStock === true) : undefined,
    paused: p.paused === true,
    comingSoon: p.comingSoon === true,
  };
}
