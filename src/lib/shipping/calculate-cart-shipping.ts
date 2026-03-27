/**
 * Server-side cart shipping calculator.
 * Combines Printify API (for dropship) + ShippingRate table (for self-fulfilled).
 * Never trust client-provided amounts.
 */

import { prisma } from "@/lib/db";
import { calculatePrintifyShipping } from "@/lib/printify/shipping";

export type CartLineForShipping = {
  productId: string;
  variantId: string;
  quantity: number;
  sourceProductId?: string | null;
  sourceVariantId?: string | null;
  fulfillmentType?: string;
};

export type ShippingDestination = {
  country: string;
  region?: string;
  postalCode?: string;
};

export type ShippingQuoteResult =
  | {
      success: true;
      amount: number;
      amountCents: number;
      currency: string;
      display: string;
      breakdown: { type: string; amountCents: number; items: number }[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Resolve cart lines to include fulfillment metadata from DB.
 */
async function resolveCartForShipping(
  cart: CartLineForShipping[]
): Promise<
  Array<CartLineForShipping & { sourceProductId: string; sourceVariantId: string; fulfillmentType: string }>
> {
  const variantIds = [...new Set(cart.map((c) => c.variantId))];
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: { select: { fulfillmentType: true } },
      externalMappings: { take: 1 },
    },
  });
  const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

  const resolved: Array<
    CartLineForShipping & { sourceProductId: string; sourceVariantId: string; fulfillmentType: string }
  > = [];

  for (const item of cart) {
    const v = variantMap[item.variantId];
    if (!v || v.productId !== item.productId) continue;

    const mapping = v.externalMappings?.[0];
    const fulfillmentType = v.product.fulfillmentType;

    if (fulfillmentType === "dropship" && mapping) {
      resolved.push({
        ...item,
        sourceProductId: mapping.externalProductId,
        sourceVariantId: mapping.externalVariantId,
        fulfillmentType,
      });
    } else if (fulfillmentType === "self_fulfilled") {
      resolved.push({
        ...item,
        sourceProductId: "",
        sourceVariantId: "",
        fulfillmentType,
      });
    }
  }

  return resolved;
}

/**
 * Calculate total shipping for a cart.
 * - Printify items: use Printify API
 * - Self-fulfilled items: use ShippingRate (domestic_us or international)
 */
export async function calculateCartShipping(
  cart: CartLineForShipping[],
  destination: ShippingDestination
): Promise<ShippingQuoteResult> {
  if (cart.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  if (destination.country === "XX" || !destination.country) {
    return {
      success: false,
      error: "Please select a specific country from the list. We cannot calculate shipping for unspecified destinations.",
    };
  }

  const resolved = await resolveCartForShipping(cart);
  if (resolved.length === 0) {
    return { success: false, error: "No valid cart items" };
  }

  const printifyItems = resolved.filter((r) => r.fulfillmentType === "dropship" && r.sourceProductId);
  const selfFulfilledItems = resolved.filter((r) => r.fulfillmentType === "self_fulfilled");

  const breakdown: { type: string; amountCents: number; items: number }[] = [];
  let totalCents = 0;

  const isUS = destination.country === "US";
  const zoneType = isUS ? "domestic_us" : "international";

  // Printify items
  if (printifyItems.length > 0) {
    const variantIdNum = (id: string) => {
      const n = parseInt(id, 10);
      return Number.isNaN(n) ? 0 : n;
    };

    const byKey = new Map<string, { product_id: string; variant_id: number; quantity: number }>();
    for (const item of printifyItems) {
      const vid = variantIdNum(item.sourceVariantId);
      if (vid <= 0) continue;
      const key = `${item.sourceProductId}:${vid}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        byKey.set(key, {
          product_id: item.sourceProductId!,
          variant_id: vid,
          quantity: item.quantity,
        });
      }
    }
    const deduped = Array.from(byKey.values());

    const addressTo = {
      country: destination.country,
      region: destination.region ?? "",
      zip: destination.postalCode ?? "",
      city: "",
      address1: "",
    };

    const result = await calculatePrintifyShipping(deduped, addressTo, 1);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    totalCents += result.totalCents;
    breakdown.push({
      type: "Printify (dropship)",
      amountCents: result.totalCents,
      items: printifyItems.reduce((s, i) => s + i.quantity, 0),
    });
  }

  // Self-fulfilled items
  if (selfFulfilledItems.length > 0) {
    const rate = await prisma.shippingRate.findUnique({
      where: { zoneType },
    });
    if (!rate) {
      return {
        success: false,
        error: "Shipping rate not configured for this destination",
      };
    }
    const selfFulfilledQty = selfFulfilledItems.reduce((s, i) => s + i.quantity, 0);
    const selfFulfilledCents = rate.priceCents * Math.ceil(selfFulfilledQty / 1);
    totalCents += selfFulfilledCents;
    breakdown.push({
      type: "Self-fulfilled",
      amountCents: selfFulfilledCents,
      items: selfFulfilledQty,
    });
  }

  return {
    success: true,
    amount: totalCents / 100,
    amountCents: totalCents,
    currency: "USD",
    display: `$${(totalCents / 100).toFixed(2)}`,
    breakdown,
  };
}
