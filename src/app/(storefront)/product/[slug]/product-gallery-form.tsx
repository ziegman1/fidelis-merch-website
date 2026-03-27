"use client";

import { useMemo, useState, useEffect } from "react";
import type { UnifiedProduct, UnifiedImage } from "@/lib/catalog/types";
import { sortVariantsForDisplay } from "@/lib/catalog/sort-variants";
import { getColorFromVariant } from "@/lib/catalog/get-variant-color";
import { AddToCartForm } from "./add-to-cart-form";

export function ProductGalleryAndForm({
  product,
  orderedImages,
  colorToImageUrl,
  colorToImageIndex,
  children,
}: {
  product: UnifiedProduct;
  orderedImages: UnifiedImage[];
  colorToImageUrl?: Record<string, string>;
  /** Direct color → thumbnail index; used for active thumbnail when URL match fails. */
  colorToImageIndex?: Record<string, number>;
  children?: React.ReactNode;
}) {
  const displayVariants = useMemo(
    () => sortVariantsForDisplay(product.variants, product.colorOrder),
    [product.variants, product.colorOrder]
  );
  const defaultVariant = displayVariants[0] ?? product.variants[0];
  const [variantId, setVariantId] = useState(defaultVariant?.id ?? "");
  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const selectedColor = selectedVariant
    ? getColorFromVariant(selectedVariant)
    : undefined;

  const getUrlForColor = (color: string): string | null => {
    if (!colorToImageUrl || !color) return null;
    const exact = colorToImageUrl[color];
    if (exact) return exact;
    const lower = color.toLowerCase();
    const key = Object.keys(colorToImageUrl).find((k) => k.toLowerCase() === lower);
    return key ? colorToImageUrl[key] : null;
  };

  const variantDrivenUrl =
    (selectedColor && getUrlForColor(selectedColor)) || orderedImages[0]?.url || null;

  // Interaction: hover = temporary preview; click = lock selected; color change = switch to color image + update active thumbnail; main image always object-contain (full, never cropped).
  /** Persistent selected image index; null = use variant-driven image (color mapping or first). */
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  /** Temporary hover preview; when set, main image shows this instead of selected. */
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);

  const selectedImageUrl =
    selectedImageIndex !== null && orderedImages[selectedImageIndex]
      ? orderedImages[selectedImageIndex].url
      : variantDrivenUrl;

  const displayUrl =
    hoveredImageIndex !== null && orderedImages[hoveredImageIndex]
      ? orderedImages[hoveredImageIndex].url
      : selectedImageUrl;


  const getIndexForColor = (color: string): number => {
    if (!colorToImageIndex || !color) return -1;
    const exact = colorToImageIndex[color];
    if (exact != null && orderedImages[exact]) return exact;
    const lower = color.toLowerCase();
    const key = Object.keys(colorToImageIndex).find((k) => k.toLowerCase() === lower);
    return key != null && orderedImages[colorToImageIndex[key]] ? colorToImageIndex[key] : -1;
  };

  const colorDrivenIndex = selectedColor ? getIndexForColor(selectedColor) : -1;

  useEffect(() => {
    setHoveredImageIndex(null);
    const idx = colorDrivenIndex >= 0 ? colorDrivenIndex : null;
    setSelectedImageIndex(idx);
  }, [variantId, colorDrivenIndex]);
  const urlMatchIndex = orderedImages.findIndex((img) => img.url === variantDrivenUrl);

  const activeThumbnailIndex =
    selectedImageIndex !== null
      ? selectedImageIndex
      : colorDrivenIndex >= 0
        ? colorDrivenIndex
        : urlMatchIndex >= 0
          ? urlMatchIndex
          : -1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0 h-full">
      <div className="min-h-0 flex flex-col">
        {/* Full image contained in viewport; object-contain so nothing cropped */}
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden flex items-center justify-center bg-white/90 border border-brand-primary/25 p-3 md:p-4 shadow-inner">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={product.title}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none transition-opacity duration-200"
            />
          ) : orderedImages[0] ? (
            <img
              src={orderedImages[0].url}
              alt={orderedImages[0].alt ?? product.title}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            />
          ) : (
            <div className="flex items-center justify-center text-brand-ink/50 text-sm py-12">
              No image
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex flex-col gap-3 overflow-y-auto">
        {children}
        {selectedVariant && (
          <p className="text-2xl text-brand-accent font-semibold shrink-0">
            ${(selectedVariant.priceCents / 100).toFixed(2)}
          </p>
        )}
        <AddToCartForm
          product={product}
          orderedImages={orderedImages}
          colorToImageUrl={colorToImageUrl}
          variantId={variantId}
          onVariantChange={setVariantId}
          selectedImageUrl={selectedImageUrl}
        />
        {orderedImages.length > 1 && (
          <div className="flex flex-wrap gap-2 shrink-0 pt-1">
            {orderedImages.slice(0, 10).map((img, i) => {
              const isActive = activeThumbnailIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  onMouseEnter={() => setHoveredImageIndex(i)}
                  onMouseLeave={() => setHoveredImageIndex(null)}
                  className={`w-20 h-20 flex-shrink-0 rounded-md overflow-hidden transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-surface shadow-[0_0_12px_rgba(237,183,62,0.35)]"
                      : "border border-brand-primary/30 bg-white/80 hover:border-brand-primary/50 opacity-90 hover:opacity-100"
                  }`}
                  aria-pressed={isActive}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? product.title}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
