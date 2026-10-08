import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { isStripeSecretKeyAllowed } from "@/lib/env-safety";
import { buildProductColorMapping } from "@/data/product-image-mapping";
import { getColorFromVariant } from "@/lib/catalog/get-variant-color";
import { calculateCartShipping } from "@/lib/shipping/calculate-cart-shipping";
import {
  CHECKOUT_LIMITS,
  SHIPPING_LINE_NAME,
  isValidLineQuantity,
  type StoredCheckoutCartLine,
} from "@/lib/orders";

// Only productId, variantId and quantity are read; every other client field is ignored.
const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64),
  quantity: z.number(),
  slug: z.string().optional(),
  sourceType: z.string().optional(),
  fulfillmentType: z.string().optional(),
  sourceProductId: z.string().nullable().optional(),
  sourceVariantId: z.string().nullable().optional(),
});

const destinationSchema = z.object({
  country: z.string().length(2),
  region: z.string().optional(),
  postalCode: z.string().optional(),
});

const schema = z.object({
  cart: z.array(cartLineSchema),
  shippingCents: z.number().min(0).optional(),
  shippingMode: z.enum(["US", "INTL"]).optional(),
  shippingRegion: z.enum(["US", "INTL"]).optional(),
  destination: destinationSchema.optional(),
  country: z.string().optional(),
});

// Allow international shipping in Stripe Checkout
const ALLOWED_SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "IE", "NZ", "JP", "MX", "ES", "IT", "NL", "BE", "AT", "CH",
  "PL", "PT", "SE", "NO", "DK", "FI", "IN", "SG", "HK", "KR", "BR", "AR", "CL", "CO", "ZA", "IL",
  "AE", "SA", "CZ", "HU", "RO", "GR", "PH", "TH", "MY", "ID", "VN", "EG", "NG", "KE",
] as const;

function toAbsoluteUrl(url: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.startsWith("http") ? url : new URL(url, base).toString();
}

function formatVariantDescription(v: { name?: string | null; options?: unknown }): string {
  const opts = v.options as Record<string, string> | null | undefined;
  if (opts && typeof opts === "object" && Object.keys(opts).length > 0) {
    const parts = Object.entries(opts)
      .filter(([, val]) => val != null && val !== "")
      .map(([key, val]) => `${key}: ${val}`);
    return parts.length > 0 ? parts.join(" • ") : (v.name ?? "");
  }
  return v.name ?? "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const { cart } = parsed;
    if (cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (cart.length > CHECKOUT_LIMITS.maxLines) {
      return NextResponse.json(
        { error: `Your cart can contain at most ${CHECKOUT_LIMITS.maxLines} different items.` },
        { status: 400 }
      );
    }
    if (!cart.every((c) => isValidLineQuantity(c.quantity))) {
      return NextResponse.json(
        { error: `Each item quantity must be a whole number from 1 to ${CHECKOUT_LIMITS.maxQuantityPerLine}.` },
        { status: 400 }
      );
    }
    const totalQuantity = cart.reduce((sum, c) => sum + c.quantity, 0);
    if (totalQuantity > CHECKOUT_LIMITS.maxTotalQuantity) {
      return NextResponse.json(
        { error: `Your cart can contain at most ${CHECKOUT_LIMITS.maxTotalQuantity} items in total.` },
        { status: 400 }
      );
    }

    const shippingRegion = parsed.shippingRegion ?? parsed.shippingMode;
    if (!shippingRegion || (shippingRegion !== "US" && shippingRegion !== "INTL")) {
      return NextResponse.json({ error: "Shipping region must be selected." }, { status: 400 });
    }

    const destination = parsed.destination ?? {
      country: parsed.country ?? "US",
    };

    const variantIds = cart.map((c) => c.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        inventory: true,
        externalMappings: { take: 1 },
        product: {
          include: {
            provider: true,
            images: { orderBy: { sortOrder: "asc" } },
            variants: {
              orderBy: { sortOrder: "asc" },
              include: { externalMappings: { take: 1 } },
            },
          },
        },
      },
    });
    const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

    // Every submitted line must pass; one invalid line rejects the whole checkout.
    const unavailable = (title?: string) =>
      NextResponse.json(
        {
          error: title
            ? `Sorry, "${title}" is not available for checkout. Please remove it from your cart and try again.`
            : "One or more items in your cart are no longer available. Please remove them and try again.",
        },
        { status: 400 }
      );
    const requestedByVariant = new Map<string, number>();
    for (const item of cart) {
      requestedByVariant.set(item.variantId, (requestedByVariant.get(item.variantId) ?? 0) + item.quantity);
    }
    const validated: { v: (typeof variants)[number]; quantity: number }[] = [];
    for (const item of cart) {
      const v = variantMap[item.variantId];
      if (!v || v.productId !== item.productId) return unavailable();
      const product = v.product;
      if (product.status !== "PUBLISHED" || product.paused || product.comingSoon || !v.active) {
        return unavailable(product.title);
      }
      if (!(Number.isInteger(v.priceCents) && v.priceCents > 0)) return unavailable(product.title);
      if (product.fulfillmentType === "dropship") {
        if (v.printifyAvailable === false) {
          return NextResponse.json(
            { error: `Sorry, "${product.title}" (${v.name ?? "selected variant"}) is currently out of stock. Please remove it from your cart or choose a different variant.` },
            { status: 400 }
          );
        }
        const mapping = v.externalMappings[0];
        if (
          !mapping ||
          mapping.productId !== product.id ||
          !mapping.externalProductId ||
          !/^[1-9]\d*$/.test(mapping.externalVariantId) ||
          !product.provider ||
          !product.provider.isActive
        ) {
          return unavailable(product.title);
        }
      } else if (product.fulfillmentType === "self_fulfilled") {
        const requested = requestedByVariant.get(v.id) ?? item.quantity;
        if (product.markOutOfStock || !v.inventory || v.inventory.quantity < requested) {
          return NextResponse.json(
            { error: `Sorry, "${product.title}" (${v.name ?? "selected variant"}) does not have enough stock. Please reduce the quantity or remove it from your cart.` },
            { status: 400 }
          );
        }
      } else {
        return unavailable(product.title);
      }
      validated.push({ v, quantity: item.quantity });
    }

    const shippingResult = await calculateCartShipping(
      validated.map(({ v, quantity }) => ({
        productId: v.productId,
        variantId: v.id,
        quantity,
        fulfillmentType: v.product.fulfillmentType,
      })),
      destination
    );

    if (!shippingResult.success) {
      return NextResponse.json(
        { error: shippingResult.error ?? "Shipping could not be determined" },
        { status: 400 }
      );
    }
    const shippedQuantity = shippingResult.breakdown.reduce((sum, b) => sum + b.items, 0);
    if (shippedQuantity !== totalQuantity) {
      console.error("[Checkout] Shipping quote did not cover every validated line", {
        expectedUnits: totalQuantity,
        quotedUnits: shippedQuantity,
      });
      return NextResponse.json({ error: "Shipping could not be determined for every item in your cart." }, { status: 400 });
    }

    const shippingCents = shippingResult.amountCents;
    const country = destination.country;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    if (!isStripeSecretKeyAllowed(stripeKey)) {
      console.error("[Checkout] STRIPE_SECRET_KEY is not allowed in this environment (live keys only in production, test keys everywhere else)");
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const storedCart: StoredCheckoutCartLine[] = [];
    for (const { v, quantity } of validated) {
      const product = v.product;
      const slug = product.slug;

      // Build color→image mapping to show variant-specific image in checkout
      const orderedImages = product.images.map((img) => ({ url: img.url, alt: img.alt }));
      const variantsWithOptions = product.variants.map((pv) => ({
        id: pv.id,
        sourceVariantId: (pv as { externalMappings?: { externalVariantId: string }[] }).externalMappings?.[0]?.externalVariantId ?? null,
        options: (pv.options as Record<string, string> | null)
          ? Object.entries(pv.options as Record<string, string>).map(([name, value]) => ({ name, value }))
          : [],
        name: pv.name,
      }));
      const rawVariantIds = (i: { variantIds?: unknown }) => {
        const v = i.variantIds;
        if (v == null) return null;
        if (Array.isArray(v) && v.every((x) => typeof x === "number")) return v as number[];
        return null;
      };
      const { colorToImageUrl } = buildProductColorMapping(
        {
          images: product.images.map((i) => ({
            url: i.url,
            sortOrder: i.sortOrder,
            variantId: null,
            variantIds: rawVariantIds(i as { variantIds?: unknown }),
          })),
          variants: variantsWithOptions,
          fulfillmentType: product.fulfillmentType,
          colorOrder: product.colorOrder as string[] | null,
        },
        slug,
        orderedImages
      );

      const variantForColor = {
        options: variantsWithOptions.find((pv) => pv.id === v.id)?.options ?? [],
        name: v.name,
      };
      const color = getColorFromVariant(variantForColor);
      const colorImageUrl = color && colorToImageUrl[color] ? colorToImageUrl[color] : null;
      const primaryImg = product.primaryImageId
        ? product.images.find((i) => i.id === product.primaryImageId)
        : null;
      const fallbackImg = primaryImg ?? product.images[0];
      const displayImg = colorImageUrl ? { url: colorImageUrl } : fallbackImg;
      const imageUrl = displayImg?.url ? toAbsoluteUrl(displayImg.url) : undefined;

      const variantDesc = formatVariantDescription(v);
      const description = variantDesc ? variantDesc : undefined;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
          },
          unit_amount: v.priceCents,
        },
        quantity,
      });
      const mapping = v.externalMappings[0];
      storedCart.push({
        productId: v.productId,
        variantId: v.id,
        quantity,
        unitPriceCents: v.priceCents,
        slug: product.slug,
        fulfillmentType: product.fulfillmentType,
        sourceProductId: mapping?.externalProductId ?? null,
        sourceVariantId: mapping?.externalVariantId ?? null,
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
            name: SHIPPING_LINE_NAME,
            description: country === "US" ? "Standard (US)" : "International",
          },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const stripe = new Stripe(stripeKey);
    // Use request origin so users return to the domain they came from (e.g. www.fidelismerch.com),
    // not the deployment URL (e.g. fidelis-merch-website.vercel.app)
    const requestOrigin = req.headers.get("origin");
    const origin =
      requestOrigin && requestOrigin.startsWith("http")
        ? requestOrigin.replace(/\/$/, "")
        : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { store: "fidelis-merch" },
      shipping_address_collection: { allowed_countries: [...ALLOWED_SHIPPING_COUNTRIES] },
    });

    await prisma.pendingCheckoutCart.upsert({
      where: { stripeSessionId: session.id },
      create: { stripeSessionId: session.id, cartJson: JSON.stringify(storedCart) },
      update: { cartJson: JSON.stringify(storedCart) },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    let message = "Checkout failed";
    if (e instanceof z.ZodError) message = "Invalid cart";
    else if (e && typeof e === "object" && "message" in e) message = String((e as Error).message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
