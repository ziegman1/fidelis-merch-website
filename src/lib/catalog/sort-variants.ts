import type { UnifiedVariant } from "./types";
import { getColorFromVariant } from "./get-variant-color";

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

function getSizeFromVariant(v: UnifiedVariant): string {
  const sizeOpt = v.options.find((o) => o.name.toLowerCase() === "size");
  if (sizeOpt?.value) return sizeOpt.value;
  return v.name?.split(/\s*\/\s*/)[1]?.trim() ?? "";
}

/**
 * Sorts variants for storefront display: first by color (using colorOrder from product editor),
 * then by size. When colorOrder is not set, returns variants unchanged.
 */
export function sortVariantsForDisplay(
  variants: UnifiedVariant[],
  colorOrder: string[] | null | undefined
): UnifiedVariant[] {
  if (!colorOrder?.length) return variants;
  return [...variants].sort((a, b) => {
    const colorA = getColorFromVariant({ options: a.options, name: a.name });
    const colorB = getColorFromVariant({ options: b.options, name: b.name });
    const idxA = colorOrder.findIndex(
      (c) => c.trim().toLowerCase() === colorA.trim().toLowerCase()
    );
    const idxB = colorOrder.findIndex(
      (c) => c.trim().toLowerCase() === colorB.trim().toLowerCase()
    );
    const orderA = idxA >= 0 ? idxA : 9999;
    const orderB = idxB >= 0 ? idxB : 9999;
    if (orderA !== orderB) return orderA - orderB;
    const sizeA = getSizeFromVariant(a);
    const sizeB = getSizeFromVariant(b);
    const sizeIdxA = SIZE_ORDER.findIndex(
      (s) => s.toUpperCase() === sizeA.toUpperCase().replace(/\s/g, "")
    );
    const sizeIdxB = SIZE_ORDER.findIndex(
      (s) => s.toUpperCase() === sizeB.toUpperCase().replace(/\s/g, "")
    );
    return (sizeIdxA >= 0 ? sizeIdxA : 999) - (sizeIdxB >= 0 ? sizeIdxB : 999);
  });
}
