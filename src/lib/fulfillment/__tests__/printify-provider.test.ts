import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrintifyProvider } from "../printify-provider";

describe("PrintifyProvider", () => {
  const provider = new PrintifyProvider();
  const origKey = process.env.PRINTIFY_API_KEY;
  const origShop = process.env.PRINTIFY_SHOP_ID;

  beforeEach(() => {
    delete process.env.PRINTIFY_API_KEY;
    delete process.env.PRINTIFY_SHOP_ID;
  });

  it("returns error when Printify is not configured", async () => {
    const result = await provider.createOrder({
      orderId: "test-order",
      items: [],
      shipping: {
        name: "Test User",
        line1: "123 Main St",
        line2: null,
        city: "Portland",
        state: "OR",
        postalCode: "97201",
        country: "US",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Printify not configured");
  });

  it("has correct provider id", () => {
    expect(provider.id).toBe("printify");
  });

  // Restore env for other tests
  afterEach(() => {
    if (origKey !== undefined) process.env.PRINTIFY_API_KEY = origKey;
    if (origShop !== undefined) process.env.PRINTIFY_SHOP_ID = origShop;
  });
});
