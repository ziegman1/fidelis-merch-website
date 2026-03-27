/**
 * Source-agnostic commerce types.
 * Unified product shape for storefront regardless of source (Printify, manual, future Shopify).
 */

export type ProductSourceType = "printify" | "manual" | "shopify";
export type ProductFulfillmentType = "print_on_demand" | "in_house";

export interface UnifiedImage {
  url: string;
  alt?: string | null;
  sortOrder: number;
  /** Optional: e.g. "Color:Navy" for color-specific main image selection */
  optionKey?: string | null;
  /** Printify variant ids this image applies to; used for color-to-image mapping */
  variantIds?: number[] | null;
  /** Internal variant id (for manual products with per-variant images) */
  variantId?: string | null;
}

export interface UnifiedVariantOption {
  name: string;
  value: string;
}

export interface UnifiedVariant {
  id: string;
  name: string | null;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  options: UnifiedVariantOption[];
  sortOrder: number;
  /** In-house only: available quantity. POD is assumed available. */
  quantityAvailable: number | null;
  /** External variant id for fulfillment (e.g. Printify variant id) */
  sourceVariantId?: string | null;
}

export interface UnifiedProduct {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  sourceType: ProductSourceType;
  fulfillmentType: ProductFulfillmentType;
  sourceProductId: string | null;
  category: string | null;
  tags: string[];
  basePriceCents: number;
  compareAtPriceCents: number | null;
  images: UnifiedImage[];
  options: { name: string; values: string[] }[];
  variants: UnifiedVariant[];
  availability: "in_stock" | "out_of_stock" | "preorder";
  featured: boolean;
  active: boolean;
  inventoryTracking: boolean;
  metadata: Record<string, unknown>;
  /** Color names in thumbnail order from product editor; when set, overrides other color mapping. */
  colorOrder?: string[] | null;
  /** URL of the primary store image (product cards); when set, use this instead of images[0]. */
  primaryImageUrl?: string | null;
  /** Self-fulfilled only: when true, product displays as out of stock regardless of inventory. */
  markOutOfStock?: boolean;
  /** When true, product card is faded with "Out of stock" watermark; add-to-cart disabled. */
  paused?: boolean;
  /** When true, product card is faded with "Coming Soon" watermark; add-to-cart disabled. */
  comingSoon?: boolean;
}

/**
 * Cart line shape for mixed-source checkout and fulfillment routing.
 * Retain sourceType, fulfillmentType, sourceProductId, sourceVariantId so
 * future checkout can route: Printify lines → Printify order creation,
 * in-house lines → internal fulfillment workflow.
 */
export interface CartLinePayload {
  productId: string;
  slug: string;
  sourceType: ProductSourceType;
  fulfillmentType: ProductFulfillmentType;
  sourceProductId: string | null;
  /** External variant id for fulfillment (e.g. Printify variant id). Null for manual/in-house. */
  sourceVariantId: string | null;
  variantId: string;
  selectedOptions: UnifiedVariantOption[];
  quantity: number;
  priceCents: number;
  imageUrl: string | null;
  title: string;
  variantName: string | null;
}
