import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  event: null as null | Record<string, unknown>,
  constructEvent: vi.fn(),
  createOrderFromSession: vi.fn(),
  getTransactionalEmailSender: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: m.constructEvent };
    checkout = {
      sessions: {
        retrieve: () => {
          throw new Error("the webhook must not contact Stripe to determine event mode");
        },
      },
    };
  },
}));
vi.mock("@/lib/orders", () => ({ createOrderFromSession: m.createOrderFromSession }));
vi.mock("@/lib/email", () => ({ getTransactionalEmailSender: m.getTransactionalEmailSender }));

import { POST } from "../route";

const signedRequest = () =>
  new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=fixture" },
    body: "{}",
  });

function completedEvent(livemode: unknown) {
  return {
    id: "evt_fixture",
    type: "checkout.session.completed",
    livemode,
    data: { object: { id: "cs_fixture", payment_status: "paid" } },
  };
}

/** Classifies the process as a real production deployment (Vitest otherwise always means "test"). */
function stubProduction(stripeSecretKey: string) {
  vi.stubEnv("VITEST", "");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("STRIPE_SECRET_KEY", stripeSecretKey);
}

describe("Stripe webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fake");
    m.constructEvent.mockImplementation(() => m.event);
    m.createOrderFromSession.mockResolvedValue({ id: "order_fixture", email: "buyer@example.invalid", totalCents: 1600, items: [] });
    m.sendEmail.mockResolvedValue({ data: { id: "email_fixture" }, error: null });
    m.getTransactionalEmailSender.mockReturnValue(m.sendEmail);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(m.constructEvent).not.toHaveBeenCalled();
  });

  it("returns 500 when webhook secret is not configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const res = await POST(signedRequest());
    expect(res.status).toBe(500);
    expect(m.constructEvent).not.toHaveBeenCalled();
  });

  async function expectRefused() {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(signedRequest());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Event mode does not match this environment" });
    expect(m.constructEvent).toHaveBeenCalledTimes(1);
    expect(m.createOrderFromSession).not.toHaveBeenCalled();
    expect(m.getTransactionalEmailSender).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(/buyer@example\.invalid/);
    errorLog.mockRestore();
  }

  it("non-production refuses a live-mode event: no order, no email", async () => {
    m.event = completedEvent(true);
    await expectRefused();
  });

  it("non-production refuses live-mode events of any type", async () => {
    m.event = { id: "evt_fixture", type: "charge.refunded", livemode: true, data: { object: {} } };
    await expectRefused();
  });

  it("production refuses a test-mode event: no order, no email", async () => {
    stubProduction("sk_live_fixture_not_real");
    m.event = completedEvent(false);
    await expectRefused();
  });

  it("refuses an event without a boolean livemode", async () => {
    m.event = completedEvent(undefined);
    await expectRefused();
  });

  it("production refuses a test secret key before verifying the event", async () => {
    stubProduction("sk_test_fake");
    m.event = completedEvent(false);
    const res = await POST(signedRequest());
    expect(res.status).toBe(500);
    expect(m.constructEvent).not.toHaveBeenCalled();
    expect(m.createOrderFromSession).not.toHaveBeenCalled();
  });

  it("non-production processes a test-mode event", async () => {
    m.event = completedEvent(false);
    const res = await POST(signedRequest());
    expect(res.status).toBe(200);
    expect(m.createOrderFromSession).toHaveBeenCalledWith("cs_fixture");
  });

  it("production processes a live-mode event", async () => {
    stubProduction("sk_live_fixture_not_real");
    m.event = completedEvent(true);
    const res = await POST(signedRequest());
    expect(res.status).toBe(200);
    expect(m.createOrderFromSession).toHaveBeenCalledWith("cs_fixture");
  });
});
