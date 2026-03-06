"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type CartItem = { productId: string; variantId: string; quantity: number };

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

  useEffect(() => {
    if (cart.length === 0) {
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
  }, [cart.map((c) => c.variantId).join(",")]);

  useEffect(() => {
    if (!loading && onSubtotalChange) {
      let total = 0;
      cart.forEach((item) => {
        const v = variants[item.variantId];
        if (v) total += v.priceCents * item.quantity;
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

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  let totalCents = 0;
  const rows = cart.map((item) => {
    const v = variants[item.variantId];
    if (!v) return null;
    const lineTotal = v.priceCents * item.quantity;
    totalCents += lineTotal;
    return (
      <tr key={item.variantId} className="border-b border-zinc-700">
        <td className="py-4">
          <Link href={`/product/${v.product.slug}`} className="text-fidelis-gold hover:underline">
            {v.product.title}
          </Link>
          {v.name && <span className="text-zinc-500 text-sm ml-2">({v.name})</span>}
        </td>
        <td className="py-4 text-zinc-400">${(v.priceCents / 100).toFixed(2)}</td>
        <td className="py-4">
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => updateQty(item.variantId, parseInt(e.target.value, 10) || 1)}
            className="w-16 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-cream"
          />
        </td>
        <td className="py-4 text-fidelis-gold">${(lineTotal / 100).toFixed(2)}</td>
        <td className="py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-red-400"
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
          <tr className="text-left text-zinc-500 text-sm border-b border-zinc-700">
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
        <p className="text-lg text-fidelis-gold">Subtotal: ${(totalCents / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
