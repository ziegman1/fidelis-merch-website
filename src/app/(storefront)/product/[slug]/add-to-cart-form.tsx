"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ProductVariant } from "@prisma/client";

export function AddToCartForm({
  productId,
  variants,
  defaultVariantId,
}: {
  productId: string;
  variants: (ProductVariant & { inventory?: { quantity: number } | null })[];
  defaultVariantId: string;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(defaultVariantId);
  const [qty, setQty] = useState(1);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const inStock =
    selectedVariant?.inventory === undefined ||
    selectedVariant?.inventory === null ||
    (selectedVariant.inventory?.quantity ?? 0) > 0;

  function addToCart(e: React.FormEvent) {
    e.preventDefault();
    const cart = getCart();
    const existing = cart.find((i) => i.variantId === variantId);
    const newQty = (existing?.quantity ?? 0) + qty;
    const updated = existing
      ? cart.map((i) => (i.variantId === variantId ? { ...i, quantity: newQty } : i))
      : [...cart, { productId, variantId, quantity: qty }];
    setCart(updated);
    router.push("/cart");
  }

  return (
    <form onSubmit={addToCart} className="mt-8 space-y-4">
      {variants.length > 1 && (
        <div className="space-y-2">
          <Label>Variant</Label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="flex h-10 w-full max-w-xs rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-cream"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name ?? v.sku ?? v.id} — ${(v.priceCents / 100).toFixed(2)}
              </option>
            ))}
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
          className="flex h-10 w-24 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-cream"
        />
      </div>
      <Button
        type="submit"
        className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90"
        disabled={!inStock}
      >
        {inStock ? "Add to cart" : "Out of stock"}
      </Button>
    </form>
  );
}

function getCart(): { productId: string; variantId: string; quantity: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem("fidelis-cart");
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function setCart(items: { productId: string; variantId: string; quantity: number }[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fidelis-cart", JSON.stringify(items));
}
