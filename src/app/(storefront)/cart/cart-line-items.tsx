"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { slugForUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CartItem } from "./cart-content";

type VariantInfo = {
  id: string;
  name: string | null;
  priceCents: number;
  product: { id: string; title: string; slug: string };
};

export function CartLineItems({
  cart,
  setCart,
  onSubtotalChange,
}: {
  cart: CartItem[];
  setCart: (c: CartItem[]) => void;
  onSubtotalChange?: (cents: number) => void;
}) {
  const [variants, setVariants] = useState<Record<string, VariantInfo>>({});
  const [loading, setLoading] = useState(true);

  const needsFetch = cart.some((i) => i.priceCents == null);
  useEffect(() => {
    if (!needsFetch || cart.length === 0) {
      setLoading(false);
      return;
    }
    fetch("/api/cart-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: cart.map((c) => c.variantId) }),
    })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, VariantInfo> = {};
        for (const v of data.variants ?? []) {
          map[v.id] = v;
        }
        setVariants(map);
      })
      .finally(() => setLoading(false));
  }, [needsFetch, cart.map((c) => c.variantId).join(",")]);

  useEffect(() => {
    if (!loading && onSubtotalChange) {
      let total = 0;
      cart.forEach((item) => {
        const price =
          item.priceCents ?? variants[item.variantId]?.priceCents ?? 0;
        total += price * item.quantity;
      });
      onSubtotalChange(total);
    }
  }, [loading, cart, variants, onSubtotalChange]);

  function remove(variantId: string) {
    setCart(cart.filter((i) => i.variantId !== variantId));
  }

  function updateQty(variantId: string, quantity: number) {
    if (quantity < 1) {
      remove(variantId);
      return;
    }
    setCart(
      cart.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  }

  if (loading && needsFetch) return <p className="text-brand-ink/60">Loading…</p>;

  function priceCentsFor(item: CartItem) {
    return item.priceCents ?? variants[item.variantId]?.priceCents ?? 0;
  }

  const totalCents = cart.reduce(
    (sum, item) => sum + priceCentsFor(item) * item.quantity,
    0,
  );

  const rows = cart.map((item) => {
    const priceCents = priceCentsFor(item);
    const title =
      item.title ?? variants[item.variantId]?.product?.title ?? "Product";
    const slug =
      item.slug ?? variants[item.variantId]?.product?.slug ?? "#";
    const variantName =
      item.variantName ?? variants[item.variantId]?.name ?? null;
    const lineTotal = priceCents * item.quantity;
    const imageUrl = item.imageUrl ?? null;
    return (
      <tr key={item.variantId} className="border-b border-brand-primary/20">
        <td className="py-4">
          <div className="flex items-center gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-14 h-14 rounded object-cover bg-brand-surface"
              />
            )}
            <div>
              <Link
                href={`/product/${slugForUrl(slug)}`}
                className="text-brand-primary hover:underline"
              >
                {title}
              </Link>
              {variantName && (
                <span className="text-brand-ink/55 text-sm ml-2">
                  ({variantName})
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="py-4 text-brand-accent font-medium">
          ${(priceCents / 100).toFixed(2)}
        </td>
        <td className="py-4">
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) =>
              updateQty(item.variantId, parseInt(e.target.value, 10) || 1)
            }
            className="w-16 rounded border border-brand-primary/35 bg-white px-2 py-1 text-sm text-brand-ink"
          />
        </td>
        <td className="py-4 text-brand-accent font-medium">
          ${(lineTotal / 100).toFixed(2)}
        </td>
        <td className="py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand-ink/55 hover:text-red-600"
            onClick={() => remove(item.variantId)}
          >
            Remove
          </Button>
        </td>
      </tr>
    );
  });

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-brand-ink/60 text-sm border-b border-brand-primary/25">
            <th className="pb-2">Product</th>
            <th className="pb-2">Price</th>
            <th className="pb-2">Qty</th>
            <th className="pb-2">Total</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <div className="mt-6 text-right">
        <p className="text-lg text-brand-accent font-semibold">
          Subtotal: ${(totalCents / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
