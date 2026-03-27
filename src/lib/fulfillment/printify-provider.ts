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

    const lineItems: { product_id: string; variant_id: string; quantity: number }[] = [];
    for (const item of input.items) {
      const mapping = await this.getMapping(item.variantId);
      if (!mapping) {
        return { success: false, error: `No Printify mapping for variant ${item.variantId}` };
      }
      lineItems.push({
        product_id: String(mapping.externalProductId),
        variant_id: String(mapping.externalVariantId),
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
        email: input.shipping.email ?? "",
        phone: "",
        country: input.shipping.country ?? "US",
        region: input.shipping.state ?? "",
        address1: input.shipping.line1 ?? "",
        address2: input.shipping.line2 ?? "",
        city: input.shipping.city ?? "",
        zip: input.shipping.postalCode ?? "",
      },
    };

    console.log("[Printify] Creating order:", {
      orderId: input.orderId,
      shopId,
      lineItems,
      url: `${PRINTIFY_API}/shops/${shopId}/orders.json`,
    });

    // Debug: log payload types before POST
    console.log("[Printify] Payload types:", {
      line_items: lineItems.map((li, i) => ({
        index: i,
        product_id: `${typeof li.product_id} "${li.product_id}"`,
        variant_id: `${typeof li.variant_id} "${li.variant_id}"`,
        quantity: `${typeof li.quantity} ${li.quantity}`,
      })),
    });

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
        console.error("[Printify] API error:", res.status, data);
        return { success: false, error: data.message ?? res.statusText };
      }
      console.log("[Printify] Order created successfully:", { externalOrderId: data.id });
      return {
        success: true,
        externalOrderId: String(data.id),
      };
    } catch (e) {
      console.error("[Printify] createOrder error:", e);
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
