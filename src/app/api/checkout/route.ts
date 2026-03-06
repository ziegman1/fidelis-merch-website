import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const schema = z.object({
  cart: z.array(
    z.object({ productId: z.string(), variantId: z.string(), quantity: z.number().min(1).max(99) })
  ),
  shippingCents: z.number().min(0).optional(),
  country: z.string().optional(),
});

// Allow international shipping in Stripe Checkout
const ALLOWED_SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "IE", "NZ", "JP", "MX", "ES", "IT", "NL", "BE", "AT", "CH",
  "PL", "PT", "SE", "NO", "DK", "FI", "IN", "SG", "HK", "KR", "BR", "AR", "CL", "CO", "ZA", "IL",
  "AE", "SA", "CZ", "HU", "RO", "GR", "PH", "TH", "MY", "ID", "VN", "EG", "NG", "KE",
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cart, shippingCents = 0, country } = schema.parse(body);
    if (cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const variantIds = cart.map((c) => c.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { images: { take: 1 } } } },
    });
    const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const item of cart) {
      const v = variantMap[item.variantId];
      if (!v || v.productId !== item.productId) continue;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: v.product.title,
            description: v.name ?? undefined,
            images: v.product.images?.length
              ? [v.product.images[0].url.startsWith("http") ? v.product.images[0].url : new URL(v.product.images[0].url, process.env.NEXTAUTH_URL ?? "http://localhost:3000").toString()]
              : undefined,
          },
          unit_amount: v.priceCents,
        },
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 });
    }

    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            description: country === "US" ? "Standard (US)" : "International",
          },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const stripe = new Stripe(stripeKey);
    const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { cart: JSON.stringify(cart) },
      shipping_address_collection: { allowed_countries: [...ALLOWED_SHIPPING_COUNTRIES] },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: e instanceof z.ZodError ? "Invalid cart" : "Checkout failed" },
      { status: 400 }
    );
  }
}
