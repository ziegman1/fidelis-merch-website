import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resendSend: vi.fn(),
  blobPut: vi.fn(),
  stripeConstructor: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: m.resendSend } };
  }),
}));
vi.mock("@vercel/blob", () => ({ put: m.blobPut }));
vi.mock("@/auth", () => ({ auth: m.auth }));
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (key: string) {
    m.stripeConstructor(key);
    return { checkout: { sessions: { retrieve: vi.fn() } }, webhooks: { constructEvent: vi.fn() } };
  }),
}));
vi.mock("@/lib/fulfillment", () => ({ routeFulfillment: vi.fn() }));

const SHIPPING = {
  name: "Test User",
  line1: "1 Test St",
  line2: null,
  city: "Portland",
  state: "OR",
  postalCode: "97201",
  country: "US",
};

const savedEnv = { ...process.env };
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network must not be used in tests"));
  process.env.PRINTIFY_API_KEY = "printify_dummy_not_real";
  process.env.PRINTIFY_SHOP_ID = "000000";
  process.env.RESEND_API_KEY = "re_dummy_not_real";
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_FakeStore123_notarealsecret";
  process.env.FIDELIS_ALLOW_PRINTIFY_READS = "true";
  process.env.FIDELIS_ALLOW_BLOB_WRITES = "true";
  process.env.FIDELIS_EMAIL_SINK = "resend-test";
});

afterEach(() => {
  fetchSpy.mockRestore();
  process.env = { ...savedEnv };
});

describe("Printify is never called outside production", () => {
  it("createOrder does not reach Printify even when fully configured", async () => {
    const { PrintifyProvider } = await import("@/lib/fulfillment/printify-provider");
    const result = await new PrintifyProvider().createOrder({ orderId: "order_x", items: [], shipping: SHIPPING });
    expect(result).toEqual({ success: false, error: "Printify order creation is disabled outside production" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shipping quotes and catalog reads do not reach Printify in test", async () => {
    const { calculatePrintifyShipping } = await import("@/lib/printify/shipping");
    const quote = await calculatePrintifyShipping([{ product_id: "p", variant_id: 1, quantity: 1 }], { country: "US" });
    expect(quote.success).toBe(false);

    const { fetchPrintifyProductList, fetchPrintifyProduct } = await import("@/lib/printify/api");
    await expect(fetchPrintifyProductList("000000")).rejects.toThrow(/Printify API reads are disabled/);
    await expect(fetchPrintifyProduct("000000", "p")).rejects.toThrow(/Printify API reads are disabled/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("email is never delivered to real recipients outside production", () => {
  const message = { from: "Fidelis Merch <orders@fidelismerch.com>", to: "customer@example.com", subject: "Hi", html: "<p>x</p>" };

  it("suppresses email in test even when a sink is configured", async () => {
    const { getTransactionalEmailSender } = await import("@/lib/email");
    const result = await getTransactionalEmailSender()!(message);
    expect(result.suppressed).toBe(true);
    expect(m.resendSend).not.toHaveBeenCalled();
  });

  it("suppresses email in development and preview by default", async () => {
    const { getTransactionalEmailSender } = await import("@/lib/email");
    for (const env of [{ NODE_ENV: "development" }, { VERCEL_ENV: "preview", NODE_ENV: "production" }]) {
      const result = await getTransactionalEmailSender({ ...env, RESEND_API_KEY: "re_dummy" })!(message);
      expect(result.suppressed).toBe(true);
    }
    expect(m.resendSend).not.toHaveBeenCalled();
  });

  it("reroutes to the Resend test sink in non-production when explicitly enabled", async () => {
    m.resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
    const { getTransactionalEmailSender } = await import("@/lib/email");
    const send = getTransactionalEmailSender({ VERCEL_ENV: "preview", NODE_ENV: "production", RESEND_API_KEY: "re_dummy", FIDELIS_EMAIL_SINK: "resend-test" })!;
    await send(message);
    expect(m.resendSend).toHaveBeenCalledWith(expect.objectContaining({ to: "delivered@resend.dev", subject: "[preview] Hi" }));
  });

  it("sends the unchanged message in production", async () => {
    m.resendSend.mockResolvedValue({ data: { id: "email_2" }, error: null });
    const { getTransactionalEmailSender } = await import("@/lib/email");
    const send = getTransactionalEmailSender({ VERCEL_ENV: "production", NODE_ENV: "production", RESEND_API_KEY: "re_dummy" })!;
    const result = await send(message);
    expect(m.resendSend).toHaveBeenCalledWith(message);
    expect(result).toEqual({ data: { id: "email_2" }, error: null });
  });
});

describe("Blob uploads are refused outside production", () => {
  it("the admin upload route never calls put()", async () => {
    m.auth.mockResolvedValue({ user: { role: "ADMIN" } });
    const { POST } = await import("@/app/api/admin/upload/route");
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    const res = await POST(new Request("http://localhost/api/admin/upload", { method: "POST", body: form }));
    expect(res.status).toBe(503);
    expect(m.blobPut).not.toHaveBeenCalled();
  });
});

describe("Stripe live keys are refused outside production", () => {
  it("the webhook rejects a live key before constructing Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_dummy_not_real";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_not_real";
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "sig" }, body: "{}" })
    );
    expect(res.status).toBe(500);
    expect(m.stripeConstructor).not.toHaveBeenCalled();
  });

  it("order creation refuses a live key before constructing Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_dummy_not_real";
    const { createOrderFromSession } = await import("@/lib/orders");
    await expect(createOrderFromSession("cs_test_x")).rejects.toThrow(/LIVE-mode Stripe key/);
    expect(m.stripeConstructor).not.toHaveBeenCalled();
  });
});

describe("the Prisma client refuses the production database outside production", () => {
  it("db.ts refuses on first use when DATABASE_URL is a production database", async () => {
    vi.resetModules();
    const envSafety = await import("@/lib/env-safety");
    const fake = createHash("sha256").update("supabase:zyxwvutsrqponmlkjihg").digest("hex");
    (envSafety.PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).add(fake);
    process.env.DATABASE_URL = "postgresql://postgres.zyxwvutsrqponmlkjihg:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    const g = globalThis as unknown as { prisma?: unknown };
    const cached = g.prisma;
    delete g.prisma;
    try {
      const { prisma } = await import("@/lib/db");
      expect(() => prisma.order).toThrow(/PRODUCTION database/);
      expect(g.prisma).toBeUndefined();
    } finally {
      (envSafety.PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).delete(fake);
      if (cached !== undefined) g.prisma = cached;
    }
  });
});
