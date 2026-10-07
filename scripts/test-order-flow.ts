#!/usr/bin/env tsx
/**
 * Order flow test script.
 * Validates Stripe + Printify integration and optionally runs a manual E2E test.
 *
 * Usage:
 *   npm run test:order                    # Validate config and print manual test steps
 *   npm run test:order -- --create         # Create test checkout URL (uses script env)
 *   npm run test:order -- --verify <id>    # Verify order was created and sent to Printify
 */

import Stripe from "stripe";
import { prisma } from "../src/lib/db";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

async function validateConfig(): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) errors.push("STRIPE_SECRET_KEY is not set");
  if (!process.env.STRIPE_WEBHOOK_SECRET) errors.push("STRIPE_WEBHOOK_SECRET is not set (required for webhook)");
  if (!process.env.PRINTIFY_API_KEY) errors.push("PRINTIFY_API_KEY is not set");
  if (!process.env.PRINTIFY_SHOP_ID) errors.push("PRINTIFY_SHOP_ID is not set");
  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL is not set");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Validate Stripe key format
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  if (!sk.startsWith("sk_")) {
    errors.push("STRIPE_SECRET_KEY should start with sk_");
  } else if (sk.startsWith("sk_live_") && !process.env.CI) {
    console.warn("⚠️  Using STRIPE_SECRET_KEY (live). For testing, use sk_test_ keys.");
  }

  return { ok: errors.length === 0, errors };
}

async function validateDb(): Promise<{ ok: boolean; message: string }> {
  try {
    const printifyProvider = await prisma.provider.findFirst({
      where: { slug: "printify" },
    });
    if (!printifyProvider) {
      return { ok: false, message: "No Printify provider found in DB. Run sync or seed." };
    }

    const dropshipProduct = await prisma.product.findFirst({
      where: {
        fulfillmentType: "dropship",
        providerId: printifyProvider.id,
        status: "PUBLISHED",
      },
      include: {
        variants: { where: { active: true }, take: 1 },
      },
    });

    if (!dropshipProduct || dropshipProduct.variants.length === 0) {
      return { ok: false, message: "No published dropship product with active variant found." };
    }

    const variant = dropshipProduct.variants[0]!;
    const mapping = await prisma.externalProductMapping.findFirst({
      where: { productVariantId: variant.id },
    });

    if (!mapping) {
      return {
        ok: false,
        message: `Product "${dropshipProduct.title}" has no Printify mapping for variant ${variant.name ?? variant.id}. Run sync-printify.`,
      };
    }

    return {
      ok: true,
      message: `Ready: ${dropshipProduct.title} (${variant.name ?? variant.id}) has Printify mapping.`,
    };
  } catch (e) {
    return { ok: false, message: `DB error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function createTestCheckout(): Promise<{ url: string; sessionId: string } | { error: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) return { error: "STRIPE_SECRET_KEY not set" };

  const printifyProvider = await prisma.provider.findFirst({
    where: { slug: "printify" },
  });
  if (!printifyProvider) return { error: "No Printify provider" };

  const product = await prisma.product.findFirst({
    where: {
      fulfillmentType: "dropship",
      providerId: printifyProvider.id,
      status: "PUBLISHED",
    },
    include: {
      variants: { where: { active: true }, take: 1 },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product || product.variants.length === 0) {
    return { error: "No published dropship product with active variant" };
  }

  const variant = product.variants[0]!;
  const mapping = await prisma.externalProductMapping.findFirst({
    where: { productVariantId: variant.id },
  });
  if (!mapping) return { error: "No Printify mapping for variant" };

  const cart = [
    {
      productId: product.id,
      variantId: variant.id,
      quantity: 1,
      slug: product.slug,
      sourceType: "printify",
      fulfillmentType: "dropship",
      sourceProductId: mapping.externalProductId,
      sourceVariantId: mapping.externalVariantId,
    },
  ];

  try {
    const stripe = new Stripe(stripeKey);
    const primaryImg = product.primaryImageId
      ? product.images.find((i) => i.id === product.primaryImageId)
      : null;
    const displayImg = primaryImg ?? product.images[0];
    const imageUrl = displayImg?.url.startsWith("http")
      ? displayImg.url
      : displayImg?.url
        ? new URL(displayImg.url, BASE_URL).toString()
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: variant.name ?? undefined,
              images: imageUrl ? [imageUrl] : undefined,
            },
            unit_amount: variant.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cart`,
      metadata: { store: "fidelis-merch" },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IE", "NZ", "JP", "MX", "ES", "IT", "NL", "BE", "AT", "CH", "PL", "PT", "SE", "NO", "DK", "FI"],
      },
    });

    await prisma.pendingCheckoutCart.upsert({
      where: { stripeSessionId: session.id },
      create: { stripeSessionId: session.id, cartJson: JSON.stringify(cart) },
      update: { cartJson: JSON.stringify(cart) },
    });

    if (!session.url) return { error: "No checkout URL from Stripe" };
    return { url: session.url, sessionId: session.id };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
    return { error: msg };
  }
}

async function verifyOrder(sessionId: string): Promise<{ ok: boolean; details: string }> {
  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      fulfillments: { include: { provider: true } },
    },
  });

  if (!order) {
    return { ok: false, details: `No order found for session ${sessionId}` };
  }

  const fulfillments = order.fulfillments ?? [];
  const printifyFulfillment = fulfillments.find((f) => f.provider?.slug === "printify");

  if (!printifyFulfillment) {
    return {
      ok: false,
      details: `Order ${order.id} exists but no Printify fulfillment. Fulfillments: ${fulfillments.map((f) => f.provider?.slug ?? "unknown").join(", ") || "none"}`,
    };
  }

  if (printifyFulfillment.status !== "SUBMITTED") {
    return {
      ok: false,
      details: `Printify fulfillment status is ${printifyFulfillment.status}, expected SUBMITTED. External ID: ${printifyFulfillment.externalOrderId ?? "none"}`,
    };
  }

  if (!printifyFulfillment.externalOrderId) {
    return { ok: false, details: "Printify fulfillment has no externalOrderId" };
  }

  const dropshipItems = order.items.filter(
    (i) => i.variant.product.fulfillmentType === "dropship"
  );

  return {
    ok: true,
    details: `Order ${order.id} created. Printify order ID: ${printifyFulfillment.externalOrderId}. ${dropshipItems.length} dropship item(s).`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const sessionId = args[1];

  console.log("\n=== Order Flow Test ===\n");

  const config = await validateConfig();
  if (!config.ok) {
    console.error("Config errors:");
    config.errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
  console.log("✓ Config OK");

  const db = await validateDb();
  if (!db.ok) {
    console.error("DB:", db.message);
    process.exit(1);
  }
  console.log("✓", db.message);

  if (cmd === "--create") {
    console.log("\nCreating test checkout...");
    const result = await createTestCheckout();
    if ("error" in result) {
      console.error("Failed:", result.error);
      process.exit(1);
    }
    console.log("\n✓ Checkout URL:");
    console.log(result.url);
    console.log("\n1. Complete payment with test card: 4242 4242 4242 4242");
    console.log("2. Run: npm run test:order -- --verify", result.sessionId);
    process.exit(0);
  }

  if (cmd === "--verify" && sessionId) {
    console.log("\nVerifying order for session:", sessionId);
    const result = await verifyOrder(sessionId);
    if (!result.ok) {
      console.error("✗", result.details);
      process.exit(1);
    }
    console.log("\n✓", result.details);
    process.exit(0);
  }

  // Default: print manual test steps
  console.log("\n--- Manual E2E Test Steps ---\n");
  console.log("1. Start dev server:  npm run dev");
  console.log("2. Start webhook forwarding:");
  console.log("   stripe listen --forward-to localhost:3000/api/webhooks/stripe");
  console.log("3. Add STRIPE_WEBHOOK_SECRET from stripe listen to .env.local");
  console.log("4. Create test checkout:");
  console.log("   npm run test:order -- --create");
  console.log("5. Complete payment with test card: 4242 4242 4242 4242");
  console.log("6. Verify order:");
  console.log("   npm run test:order -- --verify <session_id>");
  console.log("\nFor production: ensure webhook is configured at");
  console.log("  https://www.fidelismerch.com/api/webhooks/stripe");
  console.log("  Event: checkout.session.completed\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
