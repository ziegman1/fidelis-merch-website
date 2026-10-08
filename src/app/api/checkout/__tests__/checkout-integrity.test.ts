import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Fixture = Record<string, unknown> & { id: string; productId: string; priceCents: number; product: Record<string, unknown> };

const h = vi.hoisted(() => ({
  events: [] as string[],
  variants: [] as Fixture[],
  pending: null as null | { stripeSessionId: string; cartJson: string },
  existingOrder: null as unknown,
  session: {} as Record<string, unknown>,
  lineItems: { data: [] as unknown[], has_more: false },
}));

const m = vi.hoisted(() => {
  const hh = h;
  const stripeCreate = vi.fn(async (params: unknown) => {
    hh.events.push("stripe.sessions.create");
    void params;
    return { id: "cs_test_fixture_session", url: "https://checkout.stripe.test/session" };
  });
  const stripeRetrieve = vi.fn(async () => {
    hh.events.push("stripe.sessions.retrieve");
    return hh.session;
  });
  const stripeListLineItems = vi.fn(async () => {
    hh.events.push("stripe.sessions.listLineItems");
    return hh.lineItems;
  });
  const pendingUpsert = vi.fn(async (args: unknown) => {
    hh.events.push("pending.upsert");
    void args;
    return {};
  });
  const pendingDelete = vi.fn(async () => {
    hh.events.push("pending.delete");
    return {};
  });
  const orderCreate = vi.fn(async ({ data }: { data: Record<string, unknown> & { items: { create: Record<string, unknown>[] } } }) => {
    hh.events.push("order.create");
    return { id: "order_fixture", ...data, items: data.items.create.map((i, n) => ({ id: `item_${n}`, ...i })) };
  });
  const routeFulfillment = vi.fn(async () => {
    hh.events.push("routeFulfillment");
  });
  const calculateCartShipping = vi.fn(async (lines: { quantity: number }[]) => {
    hh.events.push("shipping.quote");
    return {
      success: true as const,
      amount: 5.99,
      amountCents: 599,
      currency: "USD",
      display: "$5.99",
      breakdown: [{ type: "Printify (dropship)", amountCents: 599, items: lines.reduce((s, l) => s + l.quantity, 0) }],
    };
  });
  return { stripeCreate, stripeRetrieve, stripeListLineItems, pendingUpsert, pendingDelete, orderCreate, routeFulfillment, calculateCartShipping };
});
const { stripeCreate, stripeListLineItems, pendingUpsert, pendingDelete, orderCreate, routeFulfillment, calculateCartShipping } = m;

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: m.stripeCreate, retrieve: m.stripeRetrieve, listLineItems: m.stripeListLineItems } };
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        h.variants.filter((v) => where.id.in.includes(v.id))
      ),
    },
    pendingCheckoutCart: {
      upsert: m.pendingUpsert,
      delete: m.pendingDelete,
      findUnique: vi.fn(async () => h.pending),
    },
    order: { findUnique: vi.fn(async () => h.existingOrder), create: m.orderCreate },
  },
}));
vi.mock("@/lib/fulfillment", () => ({ routeFulfillment: m.routeFulfillment }));
vi.mock("@/lib/shipping/calculate-cart-shipping", () => ({ calculateCartShipping: m.calculateCartShipping }));
vi.mock("@/data/product-image-mapping", () => ({ buildProductColorMapping: () => ({ colorToImageUrl: {} }) }));
vi.mock("@/lib/catalog/get-variant-color", () => ({ getColorFromVariant: () => null }));

import { POST as checkout } from "../route";
import { createOrderFromSession, OrderIntegrityError } from "@/lib/orders";

function variant(id: string, productId: string, priceCents: number, opts: Record<string, unknown> = {}): Fixture {
  const fulfillmentType = (opts.fulfillmentType as string) ?? "dropship";
  const product = {
    id: productId,
    title: `Product ${productId}`,
    slug: `product-${productId}`,
    status: "PUBLISHED",
    paused: false,
    comingSoon: false,
    markOutOfStock: false,
    fulfillmentType,
    providerId: fulfillmentType === "dropship" ? "prov_printify" : null,
    provider: fulfillmentType === "dropship" ? { id: "prov_printify", slug: "printify", isActive: true } : null,
    primaryImageId: null,
    colorOrder: null,
    images: [],
    variants: [],
    ...(opts.product as Record<string, unknown>),
  };
  return {
    id,
    productId,
    name: `Variant ${id}`,
    options: null,
    priceCents,
    active: true,
    printifyAvailable: null,
    inventory: fulfillmentType === "self_fulfilled" ? { quantity: 5 } : null,
    externalMappings:
      fulfillmentType === "dropship"
        ? [{ productId, productVariantId: id, externalProductId: `ext-${productId}`, externalVariantId: "1001" }]
        : [],
    ...opts,
    product,
  };
}

const A = () => variant("vA", "pA", 2500);
const B = () => variant("vB", "pB", 3000);

function checkoutRequest(cart: unknown[], extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.fidelismerch.com" },
    body: JSON.stringify({ cart, shippingRegion: "US", destination: { country: "US" }, ...extra }),
  });
}

async function runCheckout(cart: unknown[]) {
  const res = await checkout(checkoutRequest(cart));
  return { status: res.status, body: (await res.json()) as { error?: string; url?: string } };
}

const providerCalls = () => h.events.filter((e) => e.startsWith("stripe.sessions.create") || e === "routeFulfillment");

beforeEach(() => {
  vi.clearAllMocks();
  h.events.length = 0;
  h.variants = [A(), B()];
  h.pending = null;
  h.existingOrder = null;
  h.session = { id: "cs_test_fixture_session", livemode: false, payment_status: "paid", currency: "usd", payment_intent: "pi_fixture", customer_details: { email: "buyer@example.invalid" }, shipping_details: null };
  h.lineItems = { data: [], has_more: false };
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture_not_real";
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Classifies the process as a real production deployment (Vitest otherwise always means "test"). */
function stubProduction(stripeSecretKey: string) {
  vi.stubEnv("VITEST", "");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("STRIPE_SECRET_KEY", stripeSecretKey);
}

describe("Stripe environment mode", () => {
  const valid = { productId: "pA", variantId: "vA", quantity: 1 };

  it.each([
    ["a live secret key outside production", () => vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture_not_real")],
    ["a live restricted key outside production", () => vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_fixture_not_real")],
    ["a test secret key in production", () => stubProduction("sk_test_fixture_not_real")],
    ["a malformed key", () => vi.stubEnv("STRIPE_SECRET_KEY", "not-a-stripe-key")],
  ])("checkout refuses %s before contacting Stripe", async (_label, configure) => {
    configure();
    const { status, body } = await runCheckout([valid]);
    expect(status).toBe(500);
    expect(body.error).toBe("Stripe not configured");
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(pendingUpsert).not.toHaveBeenCalled();
    expect(h.events.some((e) => e.startsWith("stripe."))).toBe(false);
  });

  it("checkout with a live key in production reaches Stripe", async () => {
    stubProduction("sk_live_fixture_not_real");
    const { status } = await runCheckout([valid]);
    expect(status).toBe(200);
    expect(stripeCreate).toHaveBeenCalledTimes(1);
  });

  async function expectModeRefusal() {
    storePending([trustedLine(A(), 1)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = await createOrderFromSession("cs_test_fixture_session").catch((e) => e);
    expect(err).toBeInstanceOf(OrderIntegrityError);
    expect((err as OrderIntegrityError).reason).toBe("STRIPE_MODE_MISMATCH");
    expect(h.events).toEqual(["stripe.sessions.retrieve"]);
    expect(orderCreate).not.toHaveBeenCalled();
    expect(pendingDelete).not.toHaveBeenCalled();
    expect(routeFulfillment).not.toHaveBeenCalled();
    expect(stripeListLineItems).not.toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(/buyer@example\.invalid|cs_test_fixture_session/);
    errorLog.mockRestore();
  }

  it("non-production refuses a live-mode session with no side effects", async () => {
    h.session.livemode = true;
    await expectModeRefusal();
  });

  it("production refuses a test-mode session with no side effects", async () => {
    stubProduction("sk_live_fixture_not_real");
    h.session.livemode = false;
    await expectModeRefusal();
  });

  it("a session without a boolean livemode is refused", async () => {
    delete h.session.livemode;
    await expectModeRefusal();
  });

  it("an existing order is not returned for a wrong-mode session", async () => {
    h.existingOrder = { id: "order_existing", items: [] };
    h.session.livemode = true;
    await expectModeRefusal();
  });

  it("production processes a live-mode session", async () => {
    stubProduction("sk_live_fixture_not_real");
    h.session.livemode = true;
    storePending([trustedLine(A(), 1)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expect(createOrderFromSession("cs_test_fixture_session")).resolves.toMatchObject({ totalCents: 2500 });
    expect(routeFulfillment).toHaveBeenCalledTimes(1);
  });
});

describe("checkout rejects the whole cart when any line is invalid (no Stripe session is created)", () => {
  const valid = { productId: "pA", variantId: "vA", quantity: 1 };

  it.each([
    ["A: valid A + product-mismatched B", [valid, { productId: "pA", variantId: "vB", quantity: 1 }]],
    ["B: valid A + nonexistent B", [valid, { productId: "pB", variantId: "does-not-exist", quantity: 1 }]],
  ])("%s", async (_, cart) => {
    const { status } = await runCheckout(cart);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(pendingUpsert).not.toHaveBeenCalled();
  });

  it.each([
    ["C: draft B", { product: { status: "DRAFT" } }],
    ["C: archived B", { product: { status: "ARCHIVED" } }],
    ["D: inactive B", { active: false }],
    ["paused B", { product: { paused: true } }],
    ["coming-soon B", { product: { comingSoon: true } }],
    ["B unavailable at Printify", { printifyAvailable: false }],
    ["B without a Printify mapping", { externalMappings: [] }],
    ["B with a non-numeric Printify variant id", { externalMappings: [{ productId: "pB", externalProductId: "ext-pB", externalVariantId: "abc" }] }],
    ["B whose provider is inactive", { product: { provider: { id: "prov_printify", slug: "printify", isActive: false } } }],
    ["B whose provider is missing", { product: { provider: null, providerId: null } }],
    ["B with a zero price", { priceCents: 0 }],
  ])("valid A + %s", async (_, opts) => {
    h.variants = [A(), variant("vB", "pB", (opts as { priceCents?: number }).priceCents ?? 3000, opts)];
    const { status } = await runCheckout([valid, { productId: "pB", variantId: "vB", quantity: 1 }]);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["self-fulfilled marked out of stock", { fulfillmentType: "self_fulfilled", product: { markOutOfStock: true } }, 1],
    ["self-fulfilled without inventory", { fulfillmentType: "self_fulfilled", inventory: null }, 1],
    ["self-fulfilled with insufficient inventory", { fulfillmentType: "self_fulfilled", inventory: { quantity: 2 } }, 3],
  ])("valid A + %s", async (_, opts, qty) => {
    h.variants = [A(), variant("vS", "pS", 1800, opts)];
    const { status } = await runCheckout([valid, { productId: "pS", variantId: "vS", quantity: qty }]);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("counts duplicate self-fulfilled lines together against inventory", async () => {
    h.variants = [variant("vS", "pS", 1800, { fulfillmentType: "self_fulfilled", inventory: { quantity: 3 } })];
    const line = { productId: "pS", variantId: "vS", quantity: 2 };
    const { status } = await runCheckout([line, line]);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["E: fractional quantity", [{ ...valid, quantity: 1.5 }]],
    ["zero quantity", [{ ...valid, quantity: 0 }]],
    ["negative quantity", [{ ...valid, quantity: -1 }]],
    ["F: quantity above 10", [{ ...valid, quantity: 11 }]],
    ["G: more than 20 lines", Array.from({ length: 21 }, () => ({ ...valid, quantity: 1 }))],
    ["H: more than 25 total units", [{ ...valid, quantity: 10 }, { productId: "pB", variantId: "vB", quantity: 10 }, { ...valid, quantity: 6 }]],
    ["empty cart", []],
  ])("%s", async (_, cart) => {
    const { status } = await runCheckout(cart);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(calculateCartShipping).not.toHaveBeenCalled();
  });

  it("rejects when the shipping quote does not cover every validated unit", async () => {
    calculateCartShipping.mockResolvedValueOnce({
      success: true,
      amount: 5.99,
      amountCents: 599,
      currency: "USD",
      display: "$5.99",
      breakdown: [{ type: "Printify (dropship)", amountCents: 599, items: 1 }],
    });
    const { status } = await runCheckout([valid, { productId: "pB", variantId: "vB", quantity: 1 }]);
    expect(status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });
});

describe("I: a valid cart stores only trusted server-built lines that match the Stripe merchandise lines", () => {
  it("ignores client-supplied price, title, image, slug, fulfillment and Printify identifiers", async () => {
    const tampered = {
      productId: "pA",
      variantId: "vA",
      quantity: 2,
      priceCents: 1,
      title: "Injected",
      imageUrl: "https://evil.example/x.png",
      slug: "injected",
      sourceType: "manual",
      fulfillmentType: "self_fulfilled",
      sourceProductId: "evil-product",
      sourceVariantId: "999999",
    };
    const { status } = await runCheckout([tampered, { productId: "pB", variantId: "vB", quantity: 1 }]);
    expect(status).toBe(200);

    const createArgs = stripeCreate.mock.calls[0][0] as { line_items: { price_data: { unit_amount: number; product_data: { name: string } }; quantity: number }[] };
    const merch = createArgs.line_items.filter((li) => li.price_data.product_data.name !== "Shipping");
    const shipping = createArgs.line_items.filter((li) => li.price_data.product_data.name === "Shipping");
    expect(merch.map((li) => [li.price_data.product_data.name, li.price_data.unit_amount, li.quantity])).toEqual([
      ["Product pA", 2500, 2],
      ["Product pB", 3000, 1],
    ]);
    expect(shipping.map((li) => li.price_data.unit_amount)).toEqual([599]);

    const upsertArgs = pendingUpsert.mock.calls[0][0] as { create: { stripeSessionId: string; cartJson: string } };
    expect(upsertArgs.create.stripeSessionId).toBe("cs_test_fixture_session");
    const stored = JSON.parse(upsertArgs.create.cartJson);
    expect(stored).toEqual([
      { productId: "pA", variantId: "vA", quantity: 2, unitPriceCents: 2500, slug: "product-pA", fulfillmentType: "dropship", sourceProductId: "ext-pA", sourceVariantId: "1001" },
      { productId: "pB", variantId: "vB", quantity: 1, unitPriceCents: 3000, slug: "product-pB", fulfillmentType: "dropship", sourceProductId: "ext-pB", sourceVariantId: "1001" },
    ]);
    expect(upsertArgs.create.cartJson).not.toMatch(/Injected|evil|999999|manual|imageUrl|"title"/);
    expect(stored.map((l: { variantId: string; quantity: number; unitPriceCents: number }) => [l.variantId, l.quantity, l.unitPriceCents])).toEqual(
      merch.map((li, i) => [stored[i].variantId, li.quantity, li.price_data.unit_amount])
    );

    expect(h.events).toEqual(["shipping.quote", "stripe.sessions.create", "pending.upsert"]);
  });
});

function stripeLine(description: string, unitAmount: number, quantity: number) {
  return { description, currency: "usd", quantity, price: { unit_amount: unitAmount }, amount_subtotal: unitAmount * quantity };
}
function storePending(lines: unknown[]) {
  h.pending = { stripeSessionId: "cs_test_fixture_session", cartJson: JSON.stringify(lines) };
}
const trustedLine = (v: Fixture, quantity: number) => ({
  productId: v.productId,
  variantId: v.id,
  quantity,
  unitPriceCents: v.priceCents,
  fulfillmentType: "dropship",
});

async function expectFailClosed(reason: string) {
  const err = await createOrderFromSession("cs_test_fixture_session").catch((e) => e);
  expect(err).toBeInstanceOf(OrderIntegrityError);
  expect((err as OrderIntegrityError).reason).toBe(reason);
  expect(orderCreate).not.toHaveBeenCalled();
  expect(routeFulfillment).not.toHaveBeenCalled();
  expect(pendingDelete).not.toHaveBeenCalled();
}

describe("createOrderFromSession fails closed (no Order, no fulfillment, pending row kept)", () => {
  it("J: original exploit — stored raw cart has an extra product-mismatched line Stripe never charged", async () => {
    storePending([{ productId: "pA", variantId: "vA", quantity: 1 }, { productId: "pA", variantId: "vB", quantity: 1 }]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expectFailClosed("VARIANT_PRODUCT_MISMATCH");
  });

  it("J: tampered cart with an extra fully-valid line Stripe never charged", async () => {
    storePending([trustedLine(A(), 1), trustedLine(B(), 1)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expectFailClosed("MERCHANDISE_SUBTOTAL_MISMATCH");
  });

  it("K: stored subtotal differs from the Stripe merchandise subtotal", async () => {
    storePending([trustedLine(A(), 2)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expectFailClosed("MERCHANDISE_SUBTOTAL_MISMATCH");
  });

  it("K: equal subtotal but different line composition", async () => {
    h.variants = [variant("vA", "pA", 1500), variant("vB", "pB", 3000)];
    storePending([{ productId: "pA", variantId: "vA", quantity: 2, unitPriceCents: 1500 }]);
    h.lineItems = { data: [stripeLine("Product pB", 3000, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expectFailClosed("MERCHANDISE_LINES_MISMATCH");
  });

  it.each([
    ["VARIANT_MISSING", [{ productId: "pZ", variantId: "vZ", quantity: 1 }]],
    ["STORED_LINE_BAD_QUANTITY", [{ productId: "pA", variantId: "vA", quantity: 1.5 }]],
    ["STORED_LINE_BAD_QUANTITY", [{ productId: "pA", variantId: "vA", quantity: 11 }]],
    ["STORED_CART_TOO_MANY_LINES", Array.from({ length: 21 }, () => ({ productId: "pA", variantId: "vA", quantity: 1 }))],
    ["STORED_CART_TOO_MANY_UNITS", [{ productId: "pA", variantId: "vA", quantity: 10 }, { productId: "pA", variantId: "vA", quantity: 10 }, { productId: "pA", variantId: "vA", quantity: 6 }]],
    ["STORED_LINE_MALFORMED", [{ variantId: "vA", quantity: 1 }]],
    ["STORED_CART_EMPTY", []],
  ])("%s", async (reason, lines) => {
    storePending(lines);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1)], has_more: false };
    await expectFailClosed(reason);
  });

  it.each([
    ["PRODUCT_NOT_PUBLISHED", { product: { status: "DRAFT" } }],
    ["VARIANT_INACTIVE", { active: false }],
    ["PRICE_CHANGED_SINCE_CHECKOUT", { priceCents: 2600 }],
  ])("%s", async (reason, opts) => {
    h.variants = [variant("vA", "pA", (opts as { priceCents?: number }).priceCents ?? 2500, opts)];
    storePending([{ productId: "pA", variantId: "vA", quantity: 1, unitPriceCents: 2500 }]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1)], has_more: false };
    await expectFailClosed(reason);
  });

  it("unparseable stored cart", async () => {
    h.pending = { stripeSessionId: "cs_test_fixture_session", cartJson: "{not json" };
    await expectFailClosed("STORED_CART_UNPARSEABLE");
  });

  it.each([
    ["CURRENCY_MISMATCH", () => { h.session.currency = "eur"; }],
    ["STRIPE_LINE_ITEMS_TRUNCATED", () => { h.lineItems.has_more = true; }],
    ["AMBIGUOUS_SHIPPING_LINE", () => { h.lineItems.data.push(stripeLine("Shipping", 100, 1)); }],
  ])("%s", async (reason, mutate) => {
    storePending([trustedLine(A(), 1)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    mutate();
    await expectFailClosed(reason);
  });

  it("unpaid session never creates an order", async () => {
    h.session.payment_status = "unpaid";
    storePending([trustedLine(A(), 1)]);
    await expect(createOrderFromSession("cs_test_fixture_session")).rejects.toThrow("Session not paid");
    expect(orderCreate).not.toHaveBeenCalled();
    expect(routeFulfillment).not.toHaveBeenCalled();
    expect(pendingDelete).not.toHaveBeenCalled();
  });

  it("M: a persistence failure keeps the pending row", async () => {
    storePending([trustedLine(A(), 1)]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    orderCreate.mockRejectedValueOnce(new Error("db write failed"));
    await expect(createOrderFromSession("cs_test_fixture_session")).rejects.toThrow("db write failed");
    expect(routeFulfillment).not.toHaveBeenCalled();
    expect(pendingDelete).not.toHaveBeenCalled();
  });
});

describe("legitimate paid sessions", () => {
  it("L + N: matching subtotal creates the order, deletes the pending row only afterwards, then fulfills", async () => {
    storePending([trustedLine(A(), 2), trustedLine(B(), 1)]);
    h.lineItems = {
      data: [stripeLine("Product pA", 2500, 2), stripeLine("Product pB", 3000, 1), stripeLine("Shipping", 599, 1)],
      has_more: false,
    };
    const order = await createOrderFromSession("cs_test_fixture_session");

    expect(order.totalCents).toBe(8000);
    const created = orderCreate.mock.calls[0][0].data.items.create;
    expect(created).toEqual([
      { variantId: "vA", quantity: 2, priceCents: 2500 },
      { variantId: "vB", quantity: 1, priceCents: 3000 },
    ]);
    expect(h.events).toEqual([
      "stripe.sessions.retrieve",
      "stripe.sessions.listLineItems",
      "order.create",
      "pending.delete",
      "routeFulfillment",
    ]);
  });

  it("an older stored row without unit prices still succeeds only when every line validates and reconciles", async () => {
    storePending([{ productId: "pA", variantId: "vA", quantity: 1 }]);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expect(createOrderFromSession("cs_test_fixture_session")).resolves.toMatchObject({ totalCents: 2500 });
    expect(routeFulfillment).toHaveBeenCalledTimes(1);
  });

  it("an existing order is returned without re-validating or re-fulfilling", async () => {
    h.existingOrder = { id: "order_existing", items: [] };
    await expect(createOrderFromSession("cs_test_fixture_session")).resolves.toEqual({ id: "order_existing", items: [] });
    expect(orderCreate).not.toHaveBeenCalled();
    expect(routeFulfillment).not.toHaveBeenCalled();
    expect(stripeListLineItems).not.toHaveBeenCalled();
  });
});

describe("original pay-A / fulfill-A+B exploit, end to end", () => {
  const exploitCart = [
    { productId: "pA", variantId: "vA", quantity: 1 },
    { productId: "anything-else", variantId: "vB", quantity: 1 },
  ];

  it("is rejected at checkout before any Stripe session or pending row exists", async () => {
    const { status } = await runCheckout(exploitCart);
    expect(status).toBe(400);
    expect(providerCalls()).toEqual([]);
    expect(pendingUpsert).not.toHaveBeenCalled();
  });

  it("cannot reach fulfillment even if a raw exploit cart was stored by the old code", async () => {
    storePending(exploitCart);
    h.lineItems = { data: [stripeLine("Product pA", 2500, 1), stripeLine("Shipping", 599, 1)], has_more: false };
    await expectFailClosed("VARIANT_PRODUCT_MISMATCH");
  });

  it("a valid checkout round-trips: what Stripe was asked to charge is exactly what becomes OrderItems", async () => {
    const { status } = await runCheckout([{ productId: "pA", variantId: "vA", quantity: 2 }, { productId: "pB", variantId: "vB", quantity: 1 }]);
    expect(status).toBe(200);
    const createArgs = stripeCreate.mock.calls[0][0] as { line_items: { price_data: { unit_amount: number; product_data: { name: string } }; quantity: number }[] };
    h.lineItems = {
      data: createArgs.line_items.map((li) => stripeLine(li.price_data.product_data.name, li.price_data.unit_amount, li.quantity)),
      has_more: false,
    };
    h.pending = { stripeSessionId: "cs_test_fixture_session", cartJson: (pendingUpsert.mock.calls[0][0] as { create: { cartJson: string } }).create.cartJson };

    await createOrderFromSession("cs_test_fixture_session");
    const items = orderCreate.mock.calls[0][0].data.items.create as { variantId: string; quantity: number; priceCents: number }[];
    const charged = createArgs.line_items.filter((li) => li.price_data.product_data.name !== "Shipping");
    expect(items.map((i) => [i.quantity, i.priceCents])).toEqual(charged.map((li) => [li.quantity, li.price_data.unit_amount]));
    expect(items.map((i) => i.variantId)).toEqual(["vA", "vB"]);
  });
});
