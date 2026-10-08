/**
 * Canonical synthetic development store. Every record is fictional and
 * recognizable: dev_seed_ ids, dev-synthetic- slugs, DEV- SKUs, the
 * dev-synthetic tag and a synthetic notice in every description.
 *
 * Printify identifiers are deliberately invalid for Printify: product ids are
 * not 24-character hex and variant ids sit in a reserved 99000xxxx range.
 */
import type { FulfillmentType, ProductStatus } from "@prisma/client";

export const DEV_SEED_ID_PREFIX = "dev_seed_";
export const DEV_SEED_TAG = "dev-synthetic";
export const DEV_SEED_IMAGE_URL = "/logo/fidelis-shield.png";
export const DEV_SEED_PUBLISHED_AT = new Date("2026-01-01T00:00:00.000Z");
export const DEV_SEED_NOTICE = "Synthetic development product. Not a real item and not for sale.";

type VariantDef = {
  key: string;
  name: string;
  sku: string;
  priceCents: number;
  options: Record<string, string>;
  active?: boolean;
  /** Self-fulfilled only. */
  inventory?: number;
  /** Dropship only. */
  printifyAvailable?: boolean;
  /** Dropship only; omitted to model an unmapped variant. */
  printifyVariantId?: string;
};

type ProductDef = {
  key: string;
  title: string;
  fulfillmentType: FulfillmentType;
  status: ProductStatus;
  featured?: boolean;
  tags: string[];
  paused?: boolean;
  comingSoon?: boolean;
  markOutOfStock?: boolean;
  printifyProductId?: string;
  collectionKeys: string[];
  variants: VariantDef[];
};

const PROVIDER = {
  id: "dev_seed_provider_printify",
  type: "PRINTIFY" as const,
  name: "Printify (synthetic dev)",
  slug: "printify",
  isActive: true,
};

const COLLECTIONS = [
  { key: "apparel", name: "Apparel (synthetic dev)", slug: "dev-apparel" },
  { key: "drinkware", name: "Drinkware (synthetic dev)", slug: "dev-drinkware" },
];

const PRODUCTS: ProductDef[] = [
  {
    key: "mug",
    title: "Synthetic Dev Mug",
    fulfillmentType: "self_fulfilled",
    status: "PUBLISHED",
    featured: true,
    tags: ["featured", "drinkware"],
    collectionKeys: ["drinkware"],
    variants: [
      { key: "11oz_black", name: "11oz Black", sku: "DEV-MUG-11OZ-BLK", priceCents: 1600, options: { Size: "11oz", Color: "Black" }, inventory: 40 },
      { key: "15oz_white", name: "15oz White", sku: "DEV-MUG-15OZ-WHT", priceCents: 1800, options: { Size: "15oz", Color: "White" }, inventory: 40 },
    ],
  },
  {
    key: "sticker_pack",
    title: "Synthetic Dev Sticker Pack",
    fulfillmentType: "self_fulfilled",
    status: "PUBLISHED",
    tags: [],
    collectionKeys: [],
    variants: [
      { key: "default", name: "Default", sku: "DEV-STICKER-DEFAULT", priceCents: 500, options: { Style: "Default" }, inventory: 3 },
      { key: "holo", name: "Holo", sku: "DEV-STICKER-HOLO", priceCents: 600, options: { Style: "Holo" }, inventory: 0 },
    ],
  },
  {
    key: "flask",
    title: "Synthetic Dev Flask",
    fulfillmentType: "self_fulfilled",
    status: "PUBLISHED",
    markOutOfStock: true,
    tags: ["drinkware"],
    collectionKeys: ["drinkware"],
    variants: [{ key: "default", name: "Default", sku: "DEV-FLASK-DEFAULT", priceCents: 2200, options: {}, inventory: 25 }],
  },
  {
    key: "cap",
    title: "Synthetic Dev Cap",
    fulfillmentType: "self_fulfilled",
    status: "PUBLISHED",
    comingSoon: true,
    tags: ["apparel"],
    collectionKeys: [],
    variants: [{ key: "default", name: "Default", sku: "DEV-CAP-DEFAULT", priceCents: 2000, options: {}, inventory: 10 }],
  },
  {
    key: "draft_item",
    title: "Synthetic Dev Draft Item",
    fulfillmentType: "self_fulfilled",
    status: "DRAFT",
    tags: [],
    collectionKeys: [],
    variants: [{ key: "default", name: "Default", sku: "DEV-DRAFT-DEFAULT", priceCents: 1000, options: {}, inventory: 10 }],
  },
  {
    key: "crew_tee",
    title: "Synthetic Dev Crew Tee",
    fulfillmentType: "dropship",
    status: "PUBLISHED",
    featured: true,
    tags: ["featured", "apparel"],
    printifyProductId: "dev-synthetic-printify-crew-tee",
    collectionKeys: ["apparel"],
    variants: [
      { key: "s_black", name: "S Black", sku: "DEV-TEE-S-BLK", priceCents: 2500, options: { Size: "S", Color: "Black" }, printifyAvailable: true, printifyVariantId: "990000001" },
      { key: "m_black", name: "M Black", sku: "DEV-TEE-M-BLK", priceCents: 2500, options: { Size: "M", Color: "Black" }, printifyAvailable: true, printifyVariantId: "990000002" },
      { key: "l_black", name: "L Black", sku: "DEV-TEE-L-BLK", priceCents: 2500, options: { Size: "L", Color: "Black" }, printifyAvailable: true, printifyVariantId: "990000003" },
      { key: "xl_black", name: "XL Black", sku: "DEV-TEE-XL-BLK", priceCents: 2700, options: { Size: "XL", Color: "Black" }, printifyAvailable: true, printifyVariantId: "990000004" },
      { key: "l_navy", name: "L Navy", sku: "DEV-TEE-L-NVY", priceCents: 2500, options: { Size: "L", Color: "Navy" }, printifyAvailable: false, printifyVariantId: "990000005" },
      { key: "xs_black", name: "XS Black", sku: "DEV-TEE-XS-BLK", priceCents: 2500, options: { Size: "XS", Color: "Black" }, active: false, printifyAvailable: true, printifyVariantId: "990000006" },
      { key: "2xl_black", name: "2XL Black", sku: "DEV-TEE-2XL-BLK", priceCents: 2700, options: { Size: "2XL", Color: "Black" }, printifyAvailable: true },
    ],
  },
  {
    key: "pullover",
    title: "Synthetic Dev Pullover",
    fulfillmentType: "dropship",
    status: "PUBLISHED",
    paused: true,
    tags: ["apparel"],
    printifyProductId: "dev-synthetic-printify-pullover",
    collectionKeys: ["apparel"],
    variants: [
      { key: "m_black", name: "M Black", sku: "DEV-PULLOVER-M-BLK", priceCents: 4000, options: { Size: "M", Color: "Black" }, printifyAvailable: true, printifyVariantId: "990000101" },
    ],
  },
];

const SHIPPING_RATES = [
  { id: "dev_seed_rate_domestic_us", zoneType: "domestic_us", name: "Standard (US)", priceCents: 599, sortOrder: 0 },
  { id: "dev_seed_rate_international", zoneType: "international", name: "International", priceCents: 1499, sortOrder: 1 },
];

const slugify = (key: string) => key.replace(/_/g, "-");

export function buildDevSeedRows() {
  const collectionId = (key: string) => `dev_seed_collection_${key}`;

  const products = PRODUCTS.map((p) => ({
    id: `dev_seed_product_${p.key}`,
    title: p.title,
    slug: `dev-synthetic-${slugify(p.key)}`,
    description: `${p.title}. ${DEV_SEED_NOTICE}`,
    shortDescription: DEV_SEED_NOTICE,
    fulfillmentType: p.fulfillmentType,
    providerId: p.fulfillmentType === "dropship" ? PROVIDER.id : null,
    published: p.status === "PUBLISHED",
    status: p.status,
    publishedAt: p.status === "PUBLISHED" ? DEV_SEED_PUBLISHED_AT : null,
    featuredImage: null,
    featured: p.featured ?? false,
    primaryImageId: `dev_seed_image_${p.key}`,
    tags: [...p.tags, DEV_SEED_TAG],
    markOutOfStock: p.markOutOfStock ?? false,
    paused: p.paused ?? false,
    comingSoon: p.comingSoon ?? false,
  }));

  const variants = PRODUCTS.flatMap((p) =>
    p.variants.map((v, i) => ({
      id: `dev_seed_variant_${p.key}_${v.key}`,
      productId: `dev_seed_product_${p.key}`,
      sku: v.sku,
      name: v.name,
      priceCents: v.priceCents,
      compareAtCents: null,
      options: v.options,
      sortOrder: i,
      active: v.active ?? true,
      imageOverride: null,
      printifyAvailable: p.fulfillmentType === "dropship" ? (v.printifyAvailable ?? null) : null,
    }))
  );

  const inventories = PRODUCTS.flatMap((p) =>
    p.variants
      .filter((v) => v.inventory !== undefined)
      .map((v) => ({
        id: `dev_seed_inventory_${p.key}_${v.key}`,
        variantId: `dev_seed_variant_${p.key}_${v.key}`,
        quantity: v.inventory!,
      }))
  );

  const externalMappings = PRODUCTS.flatMap((p) =>
    p.variants
      .filter((v) => p.printifyProductId && v.printifyVariantId)
      .map((v) => ({
        id: `dev_seed_mapping_${p.key}_${v.key}`,
        productId: `dev_seed_product_${p.key}`,
        productVariantId: `dev_seed_variant_${p.key}_${v.key}`,
        externalProductId: p.printifyProductId!,
        externalVariantId: v.printifyVariantId!,
      }))
  );

  const images = PRODUCTS.map((p) => ({
    id: `dev_seed_image_${p.key}`,
    productId: `dev_seed_product_${p.key}`,
    url: DEV_SEED_IMAGE_URL,
    alt: `${p.title} (synthetic placeholder)`,
    sortOrder: 0,
  }));

  const collections = COLLECTIONS.map((c) => ({
    id: collectionId(c.key),
    name: c.name,
    slug: c.slug,
    description: "Synthetic development collection.",
    imageUrl: null,
    featured: false,
  }));

  const productCollections = PRODUCTS.flatMap((p) =>
    p.collectionKeys.map((key) => ({ productId: `dev_seed_product_${p.key}`, collectionId: collectionId(key) }))
  );

  return {
    provider: { ...PROVIDER },
    collections,
    products,
    variants,
    inventories,
    externalMappings,
    images,
    productCollections,
    shippingRates: SHIPPING_RATES.map((r) => ({ ...r })),
  };
}

export type DevSeedRows = ReturnType<typeof buildDevSeedRows>;
