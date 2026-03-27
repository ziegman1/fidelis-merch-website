/**
 * Unified catalog: source-agnostic product list and detail.
 */

export type {
  UnifiedProduct,
  UnifiedVariant,
  UnifiedImage,
  UnifiedVariantOption,
  ProductSourceType,
  ProductFulfillmentType,
  CartLinePayload,
} from "./types";

export {
  listUnifiedProducts,
  getUnifiedProductBySlug,
  getUnifiedProductById,
} from "./aggregator";
export type { CatalogFilters } from "./aggregator";

export { syncManualProductsToDb } from "./sync-manual-products";
export { syncPrintifyToDb } from "./sync-printify-to-db";
