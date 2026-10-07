/**
 * Product tags used in the product editor and store filters.
 * Tags drive: Featured items, category sections (Apparel, Drinkware).
 */

export const PRODUCT_TAGS = {
  featured: "featured",
  apparel: "apparel",
  drinkware: "drinkware",
} as const;

export type ProductTag = (typeof PRODUCT_TAGS)[keyof typeof PRODUCT_TAGS];

/** Tags that represent categories (for grouping in All view). */
export const CATEGORY_TAGS: ProductTag[] = ["apparel", "drinkware"];

/** Display labels for tags. */
export const TAG_LABELS: Record<ProductTag, string> = {
  [PRODUCT_TAGS.featured]: "Featured",
  [PRODUCT_TAGS.apparel]: "Apparel",
  [PRODUCT_TAGS.drinkware]: "Drinkware",
};

/** All tag values for validation. */
export const ALL_TAGS = Object.values(PRODUCT_TAGS);

/** Category slugs used in shop URL params. */
export const CATEGORY_SLUGS = ["apparel", "drinkware"] as const;

/** Display labels for category slugs. */
export const CATEGORY_LABELS: Record<string, string> = {
  apparel: "Apparel",
  drinkware: "Drinkware",
  uncategorized: "Other",
};
