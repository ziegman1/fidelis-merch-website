import { prisma } from "@/lib/db";
import { PrintifyProvider } from "./printify-provider";
import type { Order } from "@prisma/client";
import type { FulfillmentProvider } from "./types";

/**
 * Fulfillment routing: splits order items by product type for mixed-source orders.
 * - Printify (dropship): routed to PrintifyProvider; uses ExternalProductMapping for sourceProductId/sourceVariantId.
 * - In-house (self_fulfilled): routed to internal workflow (PENDING fulfillment).
 * Cart/checkout retain sourceType, fulfillmentType, sourceProductId, sourceVariantId for future use (e.g. passing to providers or storing on OrderItem).
 */
const providers: Record<string, FulfillmentProvider> = {
  printify: new PrintifyProvider(),
};

export async function routeFulfillment(
  order: Order & {
    items: { id: string; variantId: string; quantity: number; variant: { productId: string; product: { fulfillmentType: string; providerId: string | null } } }[];
  }
) {
  const dropshipItems = order.items.filter(
    (i) => i.variant.product.fulfillmentType === "dropship" && i.variant.product.providerId
  );
  const selfFulfilledItems = order.items.filter(
    (i) => i.variant.product.fulfillmentType === "self_fulfilled"
  );

  const shippingCountry = (order.shippingCountry ?? "").toUpperCase();
  const isInternational = shippingCountry !== "US";

  // Customer's address (always stored on Order for your records; used for Printify only when US).
  const customerAddress = {
    name: order.shippingName,
    line1: order.shippingLine1,
    line2: order.shippingLine2,
    city: order.shippingCity,
    state: order.shippingState,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
    email: order.email,
  };

  // For international: Printify ships TO you (default address); you then ship to customer. For US: Printify ships to customer.
  let printifyShipTo = customerAddress;
  if (isInternational && dropshipItems.length > 0) {
    const defaultAddr = await prisma.defaultFulfillmentAddress.findFirst();
    if (defaultAddr) {
      printifyShipTo = {
        name: defaultAddr.name,
        line1: defaultAddr.line1,
        line2: defaultAddr.line2,
        city: defaultAddr.city,
        state: defaultAddr.state,
        postalCode: defaultAddr.postalCode,
        country: defaultAddr.country ?? "US",
        email: order.email,
      };
    }
  }

  if (dropshipItems.length > 0) {
    console.log("[Fulfillment] Routing dropship items to providers:", {
      orderId: order.id,
      dropshipCount: dropshipItems.length,
      items: dropshipItems.map((i) => ({
        variantId: i.variantId,
        fulfillmentType: i.variant.product.fulfillmentType,
      })),
    });
    const byProvider = new Map<string, typeof dropshipItems>();
    for (const item of dropshipItems) {
      const pid = item.variant.product.providerId!;
      if (!byProvider.has(pid)) byProvider.set(pid, []);
      byProvider.get(pid)!.push(item);
    }
    for (const [providerId, items] of byProvider) {
      const providerRecord = await prisma.provider.findUnique({ where: { id: providerId } });
      const adapter = providerRecord?.slug ? providers[providerRecord.slug] : null;
      if (!adapter) {
        console.error("[Fulfillment] No adapter for provider:", providerId, providerRecord?.slug);
        await prisma.fulfillment.create({
          data: {
            orderId: order.id,
            providerId,
            status: "FAILED",
          },
        });
        continue;
      }
      const fullItems = await prisma.orderItem.findMany({
        where: { id: { in: items.map((i) => i.id) } },
        include: { variant: { include: { product: true } } },
      });
      const result = await adapter.createOrder({
        orderId: order.id,
        items: fullItems,
        shipping: printifyShipTo,
      });
      if (result.success) {
        console.log("[Fulfillment] Printify order created:", {
          orderId: order.id,
          externalOrderId: result.externalOrderId,
          provider: providerRecord?.slug,
          itemCount: fullItems.length,
        });
      } else {
        console.error("[Fulfillment] Printify order failed:", {
          orderId: order.id,
          error: result.error,
          provider: providerRecord?.slug,
        });
      }
      const fulfillment = await prisma.fulfillment.create({
        data: {
          orderId: order.id,
          providerId,
          externalOrderId: result.externalOrderId ?? undefined,
          status: result.success ? "SUBMITTED" : "FAILED",
        },
      });
      if (result.success && fullItems.length > 0) {
        await prisma.fulfillmentItem.createMany({
          data: fullItems.map((oi) => ({
            fulfillmentId: fulfillment.id,
            orderItemId: oi.id,
            quantity: oi.quantity,
          })),
        });
      }
    }
  }

  if (selfFulfilledItems.length > 0) {
    const fulfillment = await prisma.fulfillment.create({
      data: {
        orderId: order.id,
        providerId: null,
        status: "PENDING",
      },
    });
    await prisma.fulfillmentItem.createMany({
      data: selfFulfilledItems.map((oi) => ({
        fulfillmentId: fulfillment.id,
        orderItemId: oi.id,
        quantity: oi.quantity,
      })),
    });
  }
}
