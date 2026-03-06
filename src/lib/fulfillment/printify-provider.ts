import type { FulfillmentProvider, CreateOrderInput, CreateOrderResult } from "./types";
import type { ExternalProductMapping } from "@prisma/client";

const PRINTIFY_API = "https://api.printify.com/v1";

export class PrintifyProvider implements FulfillmentProvider {
  readonly id = "printify";

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const apiKey = process.env.PRINTIFY_API_KEY;
    const shopId = process.env.PRINTIFY_SHOP_ID;
    if (!apiKey || !shopId) {
      return { success: false, error: "Printify not configured" };
    }

    const lineItems: { product_id: number; variant_id: number; quantity: number }[] = [];
    for (const item of input.items) {
      const mapping = await this.getMapping(item.variantId);
      if (!mapping) {
        return { success: false, error: `No Printify mapping for variant ${item.variantId}` };
      }
      lineItems.push({
        product_id: parseInt(mapping.externalProductId, 10),
        variant_id: parseInt(mapping.externalVariantId, 10),
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      return { success: false, error: "No mappable items" };
    }

    const body = {
      external_id: input.orderId,
      label: input.orderId,
      line_items: lineItems,
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: input.shipping.name?.split(" ")[0] ?? "Customer",
        last_name: input.shipping.name?.split(" ").slice(1).join(" ") ?? "",
        email: "", // required by Printify; we don't have it in shipping
        phone: "",
        country: input.shipping.country ?? "US",
        region: input.shipping.state ?? "",
        address1: input.shipping.line1 ?? "",
        address2: input.shipping.line2 ?? "",
        city: input.shipping.city ?? "",
        zip: input.shipping.postalCode ?? "",
      },
    };

    try {
      const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/orders.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message ?? res.statusText };
      }
      return {
        success: true,
        externalOrderId: String(data.id),
      };
    } catch (e) {
      console.error("Printify createOrder error:", e);
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  private async getMapping(variantId: string): Promise<ExternalProductMapping | null> {
    const { prisma } = await import("@/lib/db");
    const mapping = await prisma.externalProductMapping.findFirst({
      where: { productVariantId: variantId },
    });
    return mapping;
  }
}
