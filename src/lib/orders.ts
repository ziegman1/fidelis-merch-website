import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { routeFulfillment } from "@/lib/fulfillment";
import { assertStripeSecretKeyAllowed, getDeploymentEnvironment, isStripeLivemodeAllowed } from "@/lib/env-safety";

export const CHECKOUT_LIMITS = {
  maxLines: 20,
  maxQuantityPerLine: 10,
  maxTotalQuantity: 25,
} as const;

/** Name of the Stripe line item checkout adds for shipping; everything else is merchandise. */
export const SHIPPING_LINE_NAME = "Shipping";

/**
 * Cart line persisted in PendingCheckoutCart. Built by /api/checkout from validated database
 * records only — never from the client request — and identical to the Stripe merchandise lines.
 */
export type StoredCheckoutCartLine = {
  productId: string;
  variantId: string;
  quantity: number;
  unitPriceCents?: number;
  slug?: string;
  sourceType?: string;
  fulfillmentType?: string;
  sourceProductId?: string | null;
  sourceVariantId?: string | null;
};

export function isValidLineQuantity(quantity: unknown): quantity is number {
  return (
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= CHECKOUT_LIMITS.maxQuantityPerLine
  );
}

/** Thrown when paid-order processing refuses to create an order. Never carries customer data. */
export class OrderIntegrityError extends Error {
  constructor(
    readonly reason: string,
    readonly details: Record<string, number | string | boolean> = {}
  ) {
    super(`Order integrity check failed: ${reason}`);
    this.name = "OrderIntegrityError";
  }
}

function failClosed(
  stripeSessionId: string,
  reason: string,
  details: Record<string, number | string | boolean> = {}
): never {
  console.error("[Order] Fail-closed: no order created", {
    reason,
    session: `…${stripeSessionId.slice(-6)}`,
    ...details,
  });
  throw new OrderIntegrityError(reason, details);
}

function parseStoredCart(stripeSessionId: string, cartJson: string): StoredCheckoutCartLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cartJson);
  } catch {
    failClosed(stripeSessionId, "STORED_CART_UNPARSEABLE");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    failClosed(stripeSessionId, "STORED_CART_EMPTY");
  }
  if (parsed.length > CHECKOUT_LIMITS.maxLines) {
    failClosed(stripeSessionId, "STORED_CART_TOO_MANY_LINES", { lines: parsed.length });
  }
  let totalQuantity = 0;
  for (const [index, line] of parsed.entries()) {
    const l = line as Partial<StoredCheckoutCartLine> | null;
    if (!l || typeof l.productId !== "string" || typeof l.variantId !== "string") {
      failClosed(stripeSessionId, "STORED_LINE_MALFORMED", { line: index });
    }
    if (!isValidLineQuantity(l.quantity)) {
      failClosed(stripeSessionId, "STORED_LINE_BAD_QUANTITY", { line: index });
    }
    if (
      l.unitPriceCents !== undefined &&
      !(Number.isInteger(l.unitPriceCents) && l.unitPriceCents > 0)
    ) {
      failClosed(stripeSessionId, "STORED_LINE_BAD_PRICE", { line: index });
    }
    totalQuantity += l.quantity;
  }
  if (totalQuantity > CHECKOUT_LIMITS.maxTotalQuantity) {
    failClosed(stripeSessionId, "STORED_CART_TOO_MANY_UNITS", { units: totalQuantity });
  }
  return parsed as StoredCheckoutCartLine[];
}

type ChargedLine = { unitAmount: number; quantity: number };

/** Merchandise lines Stripe actually charged, excluding the single shipping line. */
async function getChargedMerchandise(
  stripe: Stripe,
  stripeSessionId: string,
  session: Stripe.Checkout.Session
): Promise<{ lines: ChargedLine[]; subtotalCents: number }> {
  if (session.currency !== "usd") {
    failClosed(stripeSessionId, "CURRENCY_MISMATCH", { currency: String(session.currency) });
  }
  const page = await stripe.checkout.sessions.listLineItems(stripeSessionId, { limit: 100 });
  if (page.has_more) failClosed(stripeSessionId, "STRIPE_LINE_ITEMS_TRUNCATED");

  const shippingLines = page.data.filter((li) => li.description === SHIPPING_LINE_NAME);
  if (shippingLines.length > 1) {
    failClosed(stripeSessionId, "AMBIGUOUS_SHIPPING_LINE", { shippingLines: shippingLines.length });
  }

  const lines: ChargedLine[] = [];
  let subtotalCents = 0;
  for (const li of page.data) {
    if (li.description === SHIPPING_LINE_NAME) continue;
    const unitAmount = li.price?.unit_amount;
    const quantity = li.quantity;
    if (
      li.currency !== "usd" ||
      typeof unitAmount !== "number" ||
      !Number.isInteger(unitAmount) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      li.amount_subtotal !== unitAmount * quantity
    ) {
      failClosed(stripeSessionId, "STRIPE_LINE_UNEXPECTED");
    }
    lines.push({ unitAmount, quantity });
    subtotalCents += li.amount_subtotal;
  }
  return { lines, subtotalCents };
}

const lineKey = (l: ChargedLine) => `${l.unitAmount}x${l.quantity}`;

export async function createOrderFromSession(stripeSessionId: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Stripe not configured");

  const stripe = new Stripe(assertStripeSecretKeyAllowed(stripeKey));
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  if (!isStripeLivemodeAllowed(session.livemode)) {
    failClosed(stripeSessionId, "STRIPE_MODE_MISMATCH", {
      livemode: String(session.livemode),
      environment: getDeploymentEnvironment(),
    });
  }
  if (!session.payment_status || session.payment_status !== "paid") {
    throw new Error("Session not paid");
  }

  const existing = await prisma.order.findUnique({
    where: { stripeSessionId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (existing) return existing;

  const pending = await prisma.pendingCheckoutCart.findUnique({
    where: { stripeSessionId },
  });
  if (!pending?.cartJson) throw new Error("No cart in session");
  const cart = parseStoredCart(stripeSessionId, pending.cartJson);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: cart.map((c) => c.variantId) } },
    include: { product: true },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const expected: ChargedLine[] = [];
  for (const [index, item] of cart.entries()) {
    const v = variantMap.get(item.variantId);
    if (!v) failClosed(stripeSessionId, "VARIANT_MISSING", { line: index });
    if (v.productId !== item.productId) failClosed(stripeSessionId, "VARIANT_PRODUCT_MISMATCH", { line: index });
    if (v.product.status !== "PUBLISHED") failClosed(stripeSessionId, "PRODUCT_NOT_PUBLISHED", { line: index });
    if (!v.active) failClosed(stripeSessionId, "VARIANT_INACTIVE", { line: index });
    if (!(Number.isInteger(v.priceCents) && v.priceCents > 0)) {
      failClosed(stripeSessionId, "VARIANT_BAD_PRICE", { line: index });
    }
    if (item.unitPriceCents !== undefined && item.unitPriceCents !== v.priceCents) {
      failClosed(stripeSessionId, "PRICE_CHANGED_SINCE_CHECKOUT", { line: index });
    }
    expected.push({ unitAmount: v.priceCents, quantity: item.quantity });
  }
  const expectedSubtotalCents = expected.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0);

  const charged = await getChargedMerchandise(stripe, stripeSessionId, session);
  if (charged.subtotalCents !== expectedSubtotalCents) {
    failClosed(stripeSessionId, "MERCHANDISE_SUBTOTAL_MISMATCH", {
      expectedCents: expectedSubtotalCents,
      chargedCents: charged.subtotalCents,
    });
  }
  const chargedKeys = charged.lines.map(lineKey).sort();
  const expectedKeys = expected.map(lineKey).sort();
  if (chargedKeys.length !== expectedKeys.length || chargedKeys.some((k, i) => k !== expectedKeys[i])) {
    failClosed(stripeSessionId, "MERCHANDISE_LINES_MISMATCH", {
      expectedLines: expectedKeys.length,
      chargedLines: chargedKeys.length,
    });
  }

  const shipping = session.shipping_details?.address;
  const order = await prisma.order.create({
    data: {
      stripeSessionId,
      stripePaymentIntentId: session.payment_intent as string | null,
      email: session.customer_email ?? session.customer_details?.email ?? "",
      status: "PAID",
      totalCents: expectedSubtotalCents,
      shippingName: session.shipping_details?.name ?? null,
      shippingLine1: shipping?.line1 ?? null,
      shippingLine2: shipping?.line2 ?? null,
      shippingCity: shipping?.city ?? null,
      shippingState: shipping?.state ?? null,
      shippingPostalCode: shipping?.postal_code ?? null,
      shippingCountry: shipping?.country ?? null,
      items: {
        create: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          priceCents: variantMap.get(item.variantId)!.priceCents,
        })),
      },
    },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  await prisma.pendingCheckoutCart.delete({ where: { stripeSessionId } }).catch(() => {});

  await routeFulfillment(order);
  return order;
}
