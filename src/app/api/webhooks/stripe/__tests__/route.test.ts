import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

describe("Stripe webhook", () => {
  const origKey = process.env.STRIPE_SECRET_KEY;
  const origSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when webhook secret is not configured", async () => {
    const orig = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "fake" },
      body: "{}",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    process.env.STRIPE_WEBHOOK_SECRET = orig;
  });

  afterEach(() => {
    if (origKey !== undefined) process.env.STRIPE_SECRET_KEY = origKey;
    if (origSecret !== undefined) process.env.STRIPE_WEBHOOK_SECRET = origSecret;
  });
});
