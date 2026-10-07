/**
 * Custom storefront image mapping: gallery order and color-specific main image.
 * Use this to override product imagery regardless of source (e.g. lifestyle shots for apparel).
 *
 * Example: Fidelis hoodie
 * - orderedGallery: [lifestyle, navy, maroon, gray, black, group]
 * - colorToImageUrl: { Navy: url1, Maroon: url2, ... } so when "Navy" is selected, main image switches.
 */

import { getColorFromVariant } from "@/lib/catalog/get-variant-color";

export interface ProductImageMappingEntry {
  /** Exact slug match, or use slugContains for partial match. */
  slug: string;
  /** If set, match any product slug containing this string (e.g. "seminary-hoodie"). */
  slugContains?: boolean;
  /** Preferred gallery order: image URLs in display order. If not set, use product.images order. */
  orderedImageUrls?: string[];
  /** When option "Color" has value X, use this URL as the main image. */
  colorToImageUrl?: Record<string, string>;
  /** Color names in thumbnail order: [Black, Navy, Maroon, Light steel] → orderedImages[0], [1], [2], [3]. Use when color thumbnails are first. */
  colorOrder?: string[];
  /** Or map color → image index when thumbnails include lifestyle/group shots first. */
  colorToImageIndex?: Record<string, number>;
}

export const productImageMappings: ProductImageMappingEntry[] = [
  {
    slug: "fidelis-international-seminary-hoodie",
    slugContains: true,
    colorOrder: ["Black", "Navy", "Maroon", "Light steel"],
    colorToImageIndex: {
      Black: 0,
      Navy: 1,
      Maroon: 2,
      "Light steel": 3,
      "Light Steel": 3,
    },
  },
  // Fidelis Hoodie (Printify title may produce slug "fidelis-hoodie-xxx")
  {
    slug: "fidelis-hoodie",
    slugContains: true,
    colorOrder: ["Black", "Navy", "Maroon", "Light steel"],
    colorToImageIndex: {
      Black: 0,
      Navy: 1,
      Maroon: 2,
      "Light steel": 3,
      "Light Steel": 3,
    },
  },
  {
    slug: "red-maltese-cross-crest-polo-69acd54e",
    colorOrder: ["White", "Black", "Navy", "Grey Three"],
    colorToImageIndex: {
      White: 0,
      Black: 1,
      Navy: 2,
      Grey: 3,
      Gray: 3,
      "Grey Three": 3,
      "Grey 3": 3,
    },
  },
  {
    slug: "garment-dyed-long-sleeve",
    slugContains: true,
    colorOrder: ["White", "Black"],
    colorToImageIndex: {
      White: 0,
      Black: 1,
    },
  },
  {
    slug: "heavy-cotton-tee",
    slugContains: true,
    colorOrder: ["Black", "White", "Ash"],
    colorToImageIndex: {
      Black: 0,
      Ash: 2,
      "Ash Gray": 2,
      White: 1,
    },
  },
  {
    slug: "tumbler",
    slugContains: true,
    colorOrder: ["Black", "Navy Blue", "Gold", "Silver", "White"],
    colorToImageIndex: {
      Black: 0,
      "Navy Blue": 1,
      Navy: 1,
      Gold: 2,
      Silver: 3,
      White: 4,
    },
  },
  {
    slug: "water-bottle",
    slugContains: true,
    colorOrder: ["Black", "Pink"],
    colorToImageIndex: {
      Black: 0,
      Pink: 1,
    },
  },
];

export function getImageMapping(slug: string): ProductImageMappingEntry | undefined {
  return productImageMappings.find((m) =>
    m.slugContains ? slug.includes(m.slug) : m.slug === slug
  );
}

/** Build color→image mapping from variant images (manual products with imageOverride per variant). Returns { urlMap, indexMap }. */
export function buildColorToImageUrlFromVariantImages(product: {
  images: { url: string; variantId?: string | null; sortOrder: number }[];
  variants: { id: string; options: { name: string; value: string }[]; name?: string | null }[];
}): { colorToImageUrl: Record<string, string>; colorToImageIndex: Record<string, number> } {
  const colorToImageUrl: Record<string, string> = {};
  const colorToImageIndex: Record<string, number> = {};

  const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  for (let i = 0; i < sortedImages.length; i++) {
    const img = sortedImages[i];
    if (!img.variantId) continue;
    const variant = product.variants.find((v) => v.id === img.variantId);
    if (!variant) continue;
    const color = getColorFromVariant(variant);
    if (color) {
      colorToImageUrl[color] = img.url;
      colorToImageIndex[color] = i;
    }
  }
  return { colorToImageUrl, colorToImageIndex };
}

/** Build color→image mapping from product images with variantIds (Printify). */
export function buildColorToImageUrlFromProduct(product: {
  images: { url: string; variantIds?: number[] | null }[];
  variants: {
    sourceVariantId?: string | null;
    options: { name: string; value: string }[];
  }[];
}): Record<string, string> {
  const map: Record<string, string> = {};

  for (const v of product.variants) {
    const color = getColorFromVariant(v);
    if (!color) continue;

    const extId = v.sourceVariantId;
    const extIdNum = extId != null ? parseInt(extId, 10) : NaN;
    if (Number.isNaN(extIdNum)) continue;

    const img = product.images.find((i) =>
      i.variantIds?.includes(extIdNum)
    );
    if (img) map[color] = img.url;
  }

  // Fallback: map colors to images by URL slug (e.g. "navy" in url)
  const colorSlug = (c: string) =>
    c.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  for (const v of product.variants) {
    const color = getColorFromVariant(v);
    if (!color || map[color]) continue;

    const slug = colorSlug(color);
    if (!slug) continue;

    const img = product.images.find(
      (i) =>
        i.url.toLowerCase().includes(slug) ||
        i.url.toLowerCase().includes(color.toLowerCase().replace(/\s+/g, "_"))
    );
    if (img) map[color] = img.url;
  }

  return map;
}

export type ProductForColorMapping = {
  images: { url: string; sortOrder: number; variantId?: string | null; variantIds?: number[] | null }[];
  variants: {
    id: string;
    sourceVariantId?: string | null;
    options: { name: string; value: string }[];
    name?: string | null;
  }[];
  fulfillmentType?: string;
  colorOrder?: string[] | null;
};

export type OrderedImage = { url: string; alt?: string | null };

/**
 * Builds color→image mapping for product pages. Used by storefront and admin preview.
 * Priority: 1) product.colorOrder (editor), 2) mapping file (slug match), 3) variant images, 4) Printify/URL fallback.
 */
export function buildProductColorMapping(
  product: ProductForColorMapping,
  slug: string,
  orderedImages: OrderedImage[]
): { colorToImageUrl: Record<string, string>; colorToImageIndex: Record<string, number> | undefined } {
  const hasVariantImages =
    product.images.some((i) => i.variantId) && product.fulfillmentType === "in_house";
  const variantImageMaps = hasVariantImages
    ? buildColorToImageUrlFromVariantImages(product)
    : null;

  const colorOrderFromProduct = product.colorOrder && product.colorOrder.length > 0
    ? product.colorOrder
    : null;
  const colorOrderMaps = colorOrderFromProduct
    ? (() => {
        const colorToImageUrl: Record<string, string> = {};
        const colorToImageIndex: Record<string, number> = {};
        const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
        for (let i = 0; i < colorOrderFromProduct.length && i < sortedImages.length; i++) {
          const color = colorOrderFromProduct[i];
          if (color) {
            colorToImageUrl[color] = sortedImages[i].url;
            colorToImageIndex[color] = i;
          }
        }
        return { colorToImageUrl, colorToImageIndex };
      })()
    : null;

  // Build mapping from file when slug matches (high priority for known products like tumbler)
  const mapping = getImageMapping(slug);
  let mappingColorToImageUrl: Record<string, string> = {};
  let mappingColorToImageIndex: Record<string, number> | undefined;
  if (
    mapping &&
    orderedImages.length > 0 &&
    ((mapping.colorOrder?.length ?? 0) > 0 ||
      (mapping.colorToImageIndex && Object.keys(mapping.colorToImageIndex).length > 0))
  ) {
    if (mapping.colorToImageUrl && Object.keys(mapping.colorToImageUrl).length > 0) {
      mappingColorToImageUrl = mapping.colorToImageUrl;
    } else if (mapping.colorToImageIndex) {
      for (const [color, idx] of Object.entries(mapping.colorToImageIndex)) {
        const img = orderedImages[idx];
        if (img) {
          mappingColorToImageUrl[color] = img.url;
          mappingColorToImageIndex = mappingColorToImageIndex ?? {};
          mappingColorToImageIndex[color] = idx;
        }
      }
    } else if (mapping.colorOrder) {
      for (let i = 0; i < mapping.colorOrder.length && i < orderedImages.length; i++) {
        const color = mapping.colorOrder[i];
        if (color) {
          mappingColorToImageUrl[color] = orderedImages[i].url;
          mappingColorToImageIndex = mappingColorToImageIndex ?? {};
          mappingColorToImageIndex[color] = i;
        }
      }
    }
  }

  // When mapping matches, use it as primary source (product.colorOrder assumes image order = variant order, which is often wrong for Printify)
  const hasMappingData =
    Object.keys(mappingColorToImageUrl).length > 0 || (mappingColorToImageIndex && Object.keys(mappingColorToImageIndex).length > 0);

  let colorToImageUrl: Record<string, string> = hasMappingData
    ? { ...mappingColorToImageUrl }
    : (colorOrderMaps?.colorToImageUrl ??
        variantImageMaps?.colorToImageUrl ??
        buildColorToImageUrlFromProduct(product));
  let colorToImageIndex: Record<string, number> | undefined = hasMappingData
    ? (mappingColorToImageIndex ?? {})
    : (colorOrderMaps?.colorToImageIndex ?? variantImageMaps?.colorToImageIndex);

  // Merge mapping into fallback when we have partial mapping (e.g. only some colors in mapping)
  if (!hasMappingData && Object.keys(mappingColorToImageUrl).length > 0) {
    colorToImageUrl = { ...colorToImageUrl, ...mappingColorToImageUrl };
    if (mappingColorToImageIndex) {
      colorToImageIndex = { ...colorToImageIndex, ...mappingColorToImageIndex };
    }
  }

  return { colorToImageUrl, colorToImageIndex };
}
