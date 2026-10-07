/**
 * Centralized cart persistence. All cart reads/writes go through here
 * to avoid stale state and ensure localStorage stays in sync.
 */

export const CART_KEY = "fidelis-cart";
export const SHIPPING_REGION_KEY = "fidelis-cart-shipping-region";

export type ShippingRegion = "US" | "INTL";

export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
  slug?: string;
  sourceType?: string;
  fulfillmentType?: string;
  sourceProductId?: string | null;
  sourceVariantId?: string | null;
  priceCents?: number;
  imageUrl?: string | null;
  title?: string;
  variantName?: string | null;
};

export function getCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(CART_KEY);
    const parsed = s ? JSON.parse(s) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("fidelis-cart-update"));
  } catch {
    // Ignore quota / security errors
  }
}

export function getShippingRegion(): ShippingRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(SHIPPING_REGION_KEY);
    if (s === "US" || s === "INTL") return s;
    return null;
  } catch {
    return null;
  }
}

export function setShippingRegion(region: ShippingRegion | null): void {
  if (typeof window === "undefined") return;
  try {
    if (region) {
      localStorage.setItem(SHIPPING_REGION_KEY, region);
    } else {
      localStorage.removeItem(SHIPPING_REGION_KEY);
    }
    window.dispatchEvent(new CustomEvent("fidelis-cart-update"));
  } catch {
    // Ignore
  }
}
