/**
 * In-house / manual product definitions.
 * Add drinkware, limited editions, and other items we fulfill ourselves here.
 * Slugs must be unique across the entire catalog (avoid conflicting with Printify product slugs).
 *
 * These products:
 * - Use fulfillmentType: self_fulfilled (in-house); no Printify dependency.
 * - Are synced into the DB by syncManualProductsToDb() (run from seed or admin).
 * - Appear in the unified catalog alongside Printify products.
 * Custom images: place files in public/images/products/ and reference as /images/products/filename.jpg
 */

export interface ManualProductDefinition {
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  images: { url: string; alt?: string; sortOrder?: number; optionKey?: string }[];
  variants: {
    name: string;
    sku?: string;
    priceCents: number;
    compareAtCents?: number;
    options?: Record<string, string>;
    quantity?: number;
  }[];
  featured?: boolean;
  /** External id if this was synced from somewhere; otherwise null. Always null for manual in-house products. */
  sourceProductId?: string | null;
}

export const manualProducts: ManualProductDefinition[] = [
  {
    slug: "fidelis-etched-tumbler",
    title: "Fidelis Etched Tumbler",
    description: `Premium 20oz stainless steel tumbler with the etched Fidelis International Seminary seal. Perfect for coffee, tea, or cold drinks on the go.

• Double-wall vacuum insulated — keeps hot drinks hot and cold drinks cold
• Etched design won’t fade or peel
• BPA-free, hand-wash recommended
• In-house made and fulfilled by Fidelis Merch; no third-party print-on-demand`,
    shortDescription: "20oz stainless steel tumbler with etched Fidelis seal. In-house fulfilled.",
    category: "Drinkware",
    tags: ["drinkware", "tumbler", "in-house", "fulfilled-by-fidelis"],
    images: [
      { url: "/logo/fidelis-icon.svg", alt: "Fidelis Etched Tumbler", sortOrder: 0 },
      { url: "/images/products/fidelis-etched-tumbler.jpg", alt: "Fidelis Etched Tumbler", sortOrder: 1 },
      { url: "/images/products/fidelis-etched-tumbler-lifestyle.jpg", alt: "Fidelis Tumbler in use", sortOrder: 2 },
    ],
    variants: [
      {
        name: "Default",
        sku: "TUMBLER-001",
        priceCents: 2999,
        compareAtCents: 3499,
        options: {},
        quantity: 50,
      },
    ],
    featured: true,
    sourceProductId: null,
  },
  {
    slug: "fidelis-heritage-mug",
    title: "Fidelis Heritage Mug",
    description: `Classic ceramic mug with Fidelis International Seminary branding. 11oz capacity.

• Microwave and dishwasher safe
• Sturdy ceramic, comfortable handle
• In-house fulfilled by Fidelis Merch — not Printify or other POD`,
    shortDescription: "11oz ceramic mug with Fidelis branding. In-house fulfilled.",
    category: "Drinkware",
    tags: ["drinkware", "mug", "in-house", "fulfilled-by-fidelis"],
    images: [
      { url: "/logo/fidelis-icon.svg", alt: "Fidelis Heritage Mug", sortOrder: 0 },
      { url: "/images/products/fidelis-heritage-mug.jpg", alt: "Fidelis Heritage Mug", sortOrder: 1 },
    ],
    variants: [
      {
        name: "Default",
        sku: "MUG-001",
        priceCents: 1599,
        compareAtCents: 1999,
        options: {},
        quantity: 30,
      },
    ],
    featured: false,
    sourceProductId: null,
  },
];
