"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CartLineItems } from "./cart-line-items";
import { getCart, setCart as persistCart, setShippingRegion, type CartLine } from "@/lib/cart-storage";

/** Cart line: minimal required for checkout; extended fields for display and future fulfillment routing */
export type CartItem = CartLine;

type ShippingMode = "" | "US" | "INTL";
type ShippingStatus = "idle" | "calculating" | "success" | "error";

const SHIPPING_MODE_OPTIONS: { value: ShippingMode; label: string }[] = [
  { value: "", label: "Select a Shipping Option" },
  { value: "US", label: "Ship Within the United States" },
  { value: "INTL", label: "Ship Outside the United States" },
];

const INTL_COUNTRIES = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "AR", label: "Argentina" },
  { value: "AT", label: "Austria" },
  { value: "AU", label: "Australia" },
  { value: "BE", label: "Belgium" },
  { value: "BR", label: "Brazil" },
  { value: "CA", label: "Canada" },
  { value: "CH", label: "Switzerland" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DE", label: "Germany" },
  { value: "DK", label: "Denmark" },
  { value: "EG", label: "Egypt" },
  { value: "ES", label: "Spain" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "GR", label: "Greece" },
  { value: "HK", label: "Hong Kong" },
  { value: "HU", label: "Hungary" },
  { value: "ID", label: "Indonesia" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IN", label: "India" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "KE", label: "Kenya" },
  { value: "KR", label: "South Korea" },
  { value: "MX", label: "Mexico" },
  { value: "MY", label: "Malaysia" },
  { value: "NG", label: "Nigeria" },
  { value: "NL", label: "Netherlands" },
  { value: "NO", label: "Norway" },
  { value: "NZ", label: "New Zealand" },
  { value: "PH", label: "Philippines" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "RO", label: "Romania" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "SE", label: "Sweden" },
  { value: "SG", label: "Singapore" },
  { value: "TH", label: "Thailand" },
  { value: "VN", label: "Vietnam" },
  { value: "ZA", label: "South Africa" },
];

function fetchShippingQuote(
  cart: CartItem[],
  mode: ShippingMode,
  destination: { country: string; region?: string; postalCode?: string }
): Promise<{ success: boolean; amountCents?: number; error?: string }> {
  const payload = {
    cart: cart.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      sourceProductId: item.sourceProductId ?? null,
      sourceVariantId: item.sourceVariantId ?? null,
      fulfillmentType: item.fulfillmentType,
    })),
    shippingMode: mode,
    destination: {
      country: mode === "US" ? "US" : destination.country,
      region: destination.region,
      postalCode: destination.postalCode,
    },
  };

  return fetch("/api/cart/shipping-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success && data.amountCents != null) {
        return { success: true, amountCents: data.amountCents };
      }
      return { success: false, error: data.error ?? "Could not calculate shipping" };
    })
    .catch((e) => ({
      success: false,
      error: e instanceof Error ? e.message : "Failed to calculate shipping",
    }));
}

export function CartContent() {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [shippingMode, setShippingMode] = useState<ShippingMode>("");
  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("idle");
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [intlCountry, setIntlCountry] = useState("CA");
  const [intlFormDirty, setIntlFormDirty] = useState(false);

  useEffect(() => {
    setCartState(getCart());
    setMounted(true);
  }, []);

  const setCart = useCallback((next: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartState((prev) => {
      const nextCart = typeof next === "function" ? next(prev) : next;
      persistCart(nextCart);
      return nextCart;
    });
  }, []);

  const runShippingQuote = useCallback(
    (mode: ShippingMode, destination: { country: string; region?: string; postalCode?: string }) => {
      if (cart.length === 0) return;
      setShippingStatus("calculating");
      setShippingError(null);
      fetchShippingQuote(cart, mode, destination).then((result) => {
        if (result.success && result.amountCents != null) {
          setShippingCents(result.amountCents);
          setShippingStatus("success");
          setShippingError(null);
        } else {
          setShippingCents(null);
          setShippingStatus("error");
          setShippingError(result.error ?? "Could not calculate shipping");
        }
      });
    },
    [cart]
  );

  useEffect(() => {
    if (!mounted || cart.length === 0) return;
    if (shippingMode === "US") {
      runShippingQuote("US", { country: "US" });
    } else {
      setShippingCents(null);
      setShippingStatus("idle");
      setShippingError(null);
    }
  }, [mounted, cart, shippingMode, runShippingQuote]);

  const handleIntlDetermine = () => {
    runShippingQuote("INTL", { country: intlCountry });
    setIntlFormDirty(false);
  };

  const handleShippingModeChange = (mode: ShippingMode) => {
    setShippingMode(mode);
    setShippingCents(null);
    setShippingStatus(mode === "US" ? "calculating" : "idle");
    setShippingError(null);
    setIntlFormDirty(false);
    if (mode === "US" || mode === "INTL") {
      setShippingRegion(mode);
    } else {
      setShippingRegion(null);
    }
  };

  const handleIntlFieldChange = (value: string) => {
    setIntlCountry(value);
    setIntlFormDirty(true);
    if (shippingStatus === "success") {
      setShippingCents(null);
      setShippingStatus("idle");
    }
  };

  const cartKey = cart.map((c) => `${c.variantId}:${c.quantity}`).join(",");
  const prevCartKeyRef = useRef(cartKey);
  useEffect(() => {
    if (shippingMode === "INTL" && shippingStatus === "success" && prevCartKeyRef.current !== cartKey) {
      prevCartKeyRef.current = cartKey;
      setShippingCents(null);
      setShippingStatus("idle");
      setShippingError(null);
    } else {
      prevCartKeyRef.current = cartKey;
    }
  }, [cartKey, shippingMode, shippingStatus]);

  if (!mounted) {
    return <p className="text-brand-ink/60">Loading cart…</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brand-ink/60 mb-4">Your cart is empty.</p>
        <Button asChild className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90">
          <Link href="/merch">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const shippingResolved = (shippingMode === "US" || shippingMode === "INTL") && shippingCents != null && shippingStatus === "success";
  const canCheckout = shippingResolved;
  const totalCents = subtotalCents + (shippingCents ?? 0);

  return (
    <div className="space-y-6">
      <CartLineItems cart={cart} setCart={setCart} onSubtotalChange={setSubtotalCents} />

      <div className="border-t border-brand-primary/25 pt-6 space-y-4 max-w-md">
        <div>
          <Label htmlFor="shipping-mode" className="text-brand-ink">
            Shipping to
          </Label>
          <select
            id="shipping-mode"
            value={shippingMode}
            onChange={(e) => handleShippingModeChange(e.target.value as ShippingMode)}
            className="mt-1 flex h-10 w-full rounded-md border border-brand-primary/35 bg-white px-3 py-2 text-sm text-brand-ink"
          >
            {SHIPPING_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {shippingMode === "US" && (
          <>
            {shippingStatus === "calculating" && (
              <p className="text-sm text-brand-ink/70">Calculating shipping…</p>
            )}
            {shippingStatus === "success" && (
              <p className="text-sm text-brand-ink/70">Shipping cost determined.</p>
            )}
            {shippingStatus === "error" && (
              <p className="text-sm text-amber-700">{shippingError ?? "Could not calculate shipping."}</p>
            )}
          </>
        )}

        {shippingMode === "INTL" && (
          <div className="space-y-3 rounded-md border border-brand-primary/25 bg-white/80 p-4">
            <p className="text-xs text-brand-ink/70">
              Select your country and click Determine Shipping Cost to calculate the shipping rate for your order.
            </p>
            <div>
              <Label htmlFor="intl-country" className="text-brand-ink text-sm">
                Country
              </Label>
              <select
                id="intl-country"
                value={intlCountry}
                onChange={(e) => handleIntlFieldChange(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-brand-primary/35 bg-white px-3 py-2 text-sm text-brand-ink"
              >
                {INTL_COUNTRIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={handleIntlDetermine}
              disabled={shippingStatus === "calculating"}
              className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90 disabled:opacity-50"
            >
              {shippingStatus === "calculating" ? "Calculating…" : "Determine Shipping Cost"}
            </Button>
            {shippingStatus === "success" && (
              <p className="text-sm text-brand-ink/70">Shipping cost determined.</p>
            )}
            {shippingStatus === "error" && (
              <p className="text-sm text-amber-700">{shippingError ?? "Could not calculate shipping."}</p>
            )}
          </div>
        )}

        <div className="text-right space-y-1">
          <p className="text-brand-ink/70">Subtotal: ${(subtotalCents / 100).toFixed(2)}</p>
          <p className="text-brand-ink/70">
            Shipping:{" "}
            {shippingStatus === "calculating"
              ? "Calculating…"
              : shippingCents != null
                ? `$${(shippingCents / 100).toFixed(2)}`
                : "—"}
          </p>
          <p className="text-lg text-brand-accent font-semibold">
            Total: ${(totalCents / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-brand-ink/60">
          Made-to-order items are subject to our{" "}
          <Link href="/shipping" className="text-brand-primary hover:underline">
            Shipping
          </Link>{" "}
          and{" "}
          <Link href="/returns" className="text-brand-primary hover:underline">
            Return
          </Link>{" "}
          policies.
        </p>
        <p className="text-xs text-brand-ink/60">
          By checking out, you agree to our{" "}
          <Link href="/terms" className="text-brand-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link href="/privacy" className="text-brand-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {shippingMode === "" && (
          <p className="text-sm text-amber-700">Please select a shipping option before continuing to checkout.</p>
        )}
        <CheckoutButton
          cart={cart}
          shippingCents={shippingCents}
          canCheckout={canCheckout}
          shippingRegion={shippingMode === "US" || shippingMode === "INTL" ? shippingMode : null}
          destination={
            shippingMode === "US"
              ? { country: "US" }
              : shippingMode === "INTL"
                ? { country: intlCountry }
                : { country: "" }
          }
        />
      </div>
    </div>
  );
}

function CheckoutButton({
  cart,
  shippingCents,
  canCheckout,
  shippingRegion,
  destination,
}: {
  cart: CartItem[];
  shippingCents: number | null;
  canCheckout: boolean;
  shippingRegion: "US" | "INTL" | null;
  destination: { country: string; region?: string; postalCode?: string };
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!canCheckout || shippingCents == null || !shippingRegion) return;
    setLoading(true);
    try {
      const checkoutCart = cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        slug: item.slug,
        sourceType: item.sourceType,
        fulfillmentType: item.fulfillmentType,
        sourceProductId: item.sourceProductId,
        sourceVariantId: item.sourceVariantId,
      }));
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: checkoutCart,
          shippingCents,
          shippingMode: shippingRegion,
          shippingRegion,
          destination,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data?.url) window.location.href = data.url;
      else alert(data?.error ?? (res.ok ? "Checkout failed" : `Error ${res.status}`));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    }
    setLoading(false);
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !canCheckout}
      className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90 disabled:opacity-50"
    >
      {loading ? "Redirecting…" : "Proceed to checkout"}
    </Button>
  );
}
