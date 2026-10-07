/**
 * POST /api/cart/shipping-quote
 * Server-side shipping calculation. Never trusts client amounts.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateCartShipping, type CartLineForShipping } from "@/lib/shipping/calculate-cart-shipping";

const cartLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  sourceProductId: z.string().nullable().optional(),
  sourceVariantId: z.string().nullable().optional(),
  fulfillmentType: z.string().optional(),
});

const schema = z.object({
  cart: z.array(cartLineSchema).min(1).max(50),
  shippingMode: z.enum(["US", "INTL"]),
  destination: z.object({
    country: z.string().length(2),
    region: z.string().optional(),
    postalCode: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const cart: CartLineForShipping[] = parsed.cart.map((c) => ({
      productId: c.productId,
      variantId: c.variantId,
      quantity: c.quantity,
      sourceProductId: c.sourceProductId ?? null,
      sourceVariantId: c.sourceVariantId ?? null,
      fulfillmentType: c.fulfillmentType,
    }));

    const destination = {
      country: parsed.destination.country,
      region: parsed.destination.region,
      postalCode: parsed.destination.postalCode,
    };

    const result = await calculateCartShipping(cart, destination);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      amountCents: result.amountCents,
      currency: result.currency,
      display: result.display,
      breakdown: result.breakdown,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: e.flatten() },
        { status: 400 }
      );
    }
    console.error("[shipping-quote] Error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to calculate shipping" },
      { status: 500 }
    );
  }
}
