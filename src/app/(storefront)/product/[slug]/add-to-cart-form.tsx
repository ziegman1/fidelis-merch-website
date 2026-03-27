"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UnifiedProduct, UnifiedImage } from "@/lib/catalog/types";
import { sortVariantsForDisplay } from "@/lib/catalog/sort-variants";
import { getColorFromVariant } from "@/lib/catalog/get-variant-color";
import { getCart, setCart, type CartLine } from "@/lib/cart-storage";

export function AddToCartForm({
  product,
  orderedImages,
  colorToImageUrl,
  variantId: controlledVariantId,
  onVariantChange,
  /** Currently displayed main image URL (what user sees). Use this for cart thumbnail. */
  selectedImageUrl: selectedImageUrlFromGallery,
}: {
  product: UnifiedProduct;
  orderedImages: UnifiedImage[];
  colorToImageUrl?: Record<string, string>;
  variantId?: string;
  onVariantChange?: (variantId: string) => void;
  /** Current persistent selected main image URL from gallery (for cart/checkout). */
  selectedImageUrl?: string | null;
}) {
  const displayVariants = useMemo(
    () => sortVariantsForDisplay(product.variants, product.colorOrder),
    [product.variants, product.colorOrder]
  );
  const defaultVariant = displayVariants[0] ?? product.variants[0];
  const [internalVariantId, setInternalVariantId] = useState(
    defaultVariant?.id ?? ""
  );
  const [qty, setQty] = useState(1);

  const variantId =
    controlledVariantId !== undefined ? controlledVariantId : internalVariantId;
  const setVariantId = (id: string) => {
    if (onVariantChange) onVariantChange(id);
    else setInternalVariantId(id);
  };

  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const isUnavailable = product.paused || product.comingSoon;
  const inStock =
    !isUnavailable &&
    !product.markOutOfStock &&
    (product.fulfillmentType === "print_on_demand"
      ? (selectedVariant?.quantityAvailable ?? 1) !== 0
      : (selectedVariant?.quantityAvailable ?? 0) > 0);

  const selectedColor = selectedVariant
    ? getColorFromVariant(selectedVariant)
    : undefined;
  const fallbackImageUrl =
    (selectedColor && colorToImageUrl?.[selectedColor]) ||
    orderedImages[0]?.url ||
    null;
  const cartLineImageUrl =
    selectedImageUrlFromGallery ?? fallbackImageUrl ?? orderedImages[0]?.url ?? null;

  function addToCart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;
    const cart = getCart();
    const existing = cart.find((i) => i.variantId === variantId);
    const line: CartLine = {
      productId: product.id,
      variantId: selectedVariant.id,
      quantity: existing ? existing.quantity + qty : qty,
      slug: product.slug,
      sourceType: product.sourceType,
      fulfillmentType: product.fulfillmentType,
      sourceProductId: product.sourceProductId,
      sourceVariantId: selectedVariant.sourceVariantId ?? null,
      priceCents: selectedVariant.priceCents,
      imageUrl: cartLineImageUrl,
      title: product.title,
      variantName: selectedVariant.name,
    };
    const updated = existing
      ? cart.map((i) => (i.variantId === variantId ? line : i))
      : [...cart, line];
    setCart(updated);
  }

  return (
    <form onSubmit={addToCart} className="mt-8 space-y-4">
      {product.variants.length > 1 && (
        <div className="space-y-2">
          <Label>Variant</Label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="flex h-10 w-full max-w-xs rounded-md border border-brand-primary/35 bg-white px-3 py-2 text-sm text-brand-ink"
          >
            {displayVariants.map((v) => {
              const variantOutOfStock =
                product.fulfillmentType === "print_on_demand"
                  ? v.quantityAvailable === 0
                  : (v.quantityAvailable ?? 0) <= 0;
              return (
                <option key={v.id} value={v.id} disabled={variantOutOfStock}>
                  {v.name ?? v.sku ?? v.id} — $
                  {(v.priceCents / 100).toFixed(2)}
                  {variantOutOfStock ? " (Out of stock)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="qty">Quantity</Label>
        <input
          id="qty"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
          className="flex h-10 w-24 rounded-md border border-brand-primary/35 bg-white px-3 py-2 text-sm text-brand-ink"
        />
      </div>
      <Button
        type="submit"
        className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90"
        disabled={!inStock}
      >
        {product.comingSoon ? "Coming Soon" : product.paused ? "Temporarily unavailable" : inStock ? "Add to cart" : "Out of stock"}
      </Button>
    </form>
  );
}

