"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CartLineItems } from "./cart-line-items";

type CartItem = { productId: string; variantId: string; quantity: number };

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "OTHER", label: "Other (international)" },
];

function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem("fidelis-cart");
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function CartContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [country, setCountry] = useState("US");
  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [shippingLabel, setShippingLabel] = useState<string | null>(null);

  useEffect(() => {
    setCart(getCart());
    setMounted(true);
  }, []);

  useEffect(() => {
    const code = country === "OTHER" ? "XX" : country;
    fetch("/api/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.rate) {
          setShippingCents(data.rate.priceCents);
          setShippingLabel(data.rate.name);
        } else {
          setShippingCents(null);
          setShippingLabel("—");
        }
      })
      .catch(() => {
        setShippingCents(null);
        setShippingLabel("Error loading rate");
      });
  }, [country]);

  if (!mounted) {
    return <p className="text-zinc-500">Loading cart…</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 mb-4">Your cart is empty.</p>
        <Button asChild className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const totalCents = subtotalCents + (shippingCents ?? 0);

  return (
    <div className="space-y-6">
      <CartLineItems cart={cart} setCart={setCart} onSubtotalChange={setSubtotalCents} />

      <div className="border-t border-zinc-700 pt-6 space-y-4 max-w-md">
        <div>
          <Label htmlFor="country" className="text-cream">Shipping to</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-cream"
          >
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {shippingLabel && (
          <p className="text-sm text-zinc-400">
            {shippingLabel}: {shippingCents != null ? `$${(shippingCents / 100).toFixed(2)}` : "—"}
          </p>
        )}
        <div className="text-right space-y-1">
          <p className="text-zinc-400">Subtotal: ${(subtotalCents / 100).toFixed(2)}</p>
          <p className="text-zinc-400">
            Shipping: {shippingCents != null ? `$${(shippingCents / 100).toFixed(2)}` : "—"}
          </p>
          <p className="text-lg text-fidelis-gold font-medium">
            Total: ${(totalCents / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CheckoutButton
          cart={cart}
          shippingCents={shippingCents ?? 0}
          country={country === "OTHER" ? "" : country}
          disabled={shippingCents === null}
        />
      </div>
    </div>
  );
}

function CheckoutButton({
  cart,
  shippingCents,
  country,
  disabled,
}: {
  cart: CartItem[];
  shippingCents: number;
  country: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, shippingCents, country }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed");
    } catch (e) {
      alert("Checkout failed");
    }
    setLoading(false);
  }
  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || disabled}
      className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90"
    >
      {loading ? "Redirecting…" : "Proceed to checkout"}
    </Button>
  );
}
