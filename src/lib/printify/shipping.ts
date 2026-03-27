/**
 * Printify shipping calculator - server-only.
 * Calls POST /v1/shops/{shop_id}/orders/shipping.json to get accurate shipping costs.
 * Never expose Printify token to client.
 */

import {
  getPrintifyToken,
  getPrintifyShopId,
} from "@/lib/printify/api";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export type PrintifyShippingAddress = {
  country: string;
  region?: string;
  zip?: string;
  city?: string;
  address1?: string;
  address2?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

export type PrintifyShippingLineItem = {
  product_id: string;
  variant_id: number;
  quantity: number;
  external_id?: string;
};

/** Shipping method: 1=standard, 2=priority, 3=printify_express, 4=economy */
export type PrintifyShippingMethod = 1 | 2 | 3 | 4;

export type PrintifyShippingResponse = {
  standard?: number;
  express?: number;
  priority?: number;
  printify_express?: number;
  economy?: number;
};

/**
 * Calculate shipping cost for an order using Printify's shipping API.
 * Returns costs in cents per shipping method.
 */
export async function calculatePrintifyShipping(
  lineItems: PrintifyShippingLineItem[],
  addressTo: PrintifyShippingAddress,
  shippingMethod: PrintifyShippingMethod = 1
): Promise<{ success: true; totalCents: number } | { success: false; error: string }> {
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId();

  if (!token || !shopId) {
    return { success: false, error: "Printify not configured" };
  }

  if (lineItems.length === 0) {
    return { success: false, error: "No line items" };
  }

  const body = {
    line_items: lineItems.map((item, i) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      external_id: item.external_id ?? `line-${i}`,
    })),
    address_to: {
      first_name: addressTo.first_name ?? "Customer",
      last_name: addressTo.last_name ?? "",
      email: addressTo.email ?? "",
      phone: addressTo.phone ?? "",
      country: addressTo.country,
      region: addressTo.region ?? "",
      address1: addressTo.address1 ?? "",
      address2: addressTo.address2 ?? "",
      city: addressTo.city ?? "",
      zip: addressTo.zip ?? "",
    },
  };

  try {
    const res = await fetch(
      `${PRINTIFY_API_BASE}/shops/${encodeURIComponent(shopId)}/orders/shipping.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "ZiegsMissionMerch/1.0",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[Printify shipping] API error", res.status, text.slice(0, 300));
      if (res.status === 400) {
        try {
          const json = JSON.parse(text) as { message?: string };
          return { success: false, error: json.message ?? "Invalid shipping request" };
        } catch {
          return { success: false, error: "Invalid shipping request" };
        }
      }
      return { success: false, error: `Printify API error: ${res.status}` };
    }

    const data = (await res.json()) as PrintifyShippingResponse;
    const methodKey =
      shippingMethod === 1
        ? "standard"
        : shippingMethod === 2
          ? "priority"
          : shippingMethod === 3
            ? "printify_express"
            : "economy";
    const totalCents = data[methodKey] ?? data.standard ?? 0;

    if (totalCents <= 0) {
      return { success: false, error: "Shipping not available for this destination" };
    }

    return { success: true, totalCents };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Printify shipping] Error:", msg);
    return { success: false, error: msg };
  }
}
