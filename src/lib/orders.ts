import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { routeFulfillment } from "@/lib/fulfillment";

export async function createOrderFromSession(stripeSessionId: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Stripe not configured");

  const stripe = new Stripe(stripeKey);
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
    expand: ["line_items"],
  });
  if (!session.payment_status || session.payment_status !== "paid") {
    throw new Error("Session not paid");
  }

  const existing = await prisma.order.findUnique({
    where: { stripeSessionId },
  });
  if (existing) return existing;

  const cart = session.metadata?.cart ? (JSON.parse(session.metadata.cart as string) as { productId: string; variantId: string; quantity: number }[]) : [];
  if (cart.length === 0) throw new Error("No cart in session");

  const variantIds = cart.map((c) => c.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: true },
  });
  const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

  const totalCents = cart.reduce((sum, item) => {
    const v = variantMap[item.variantId];
    return sum + (v ? v.priceCents * item.quantity : 0);
  }, 0);

  const shipping = session.shipping_details?.address;
  const order = await prisma.order.create({
    data: {
      stripeSessionId,
      stripePaymentIntentId: session.payment_intent as string | null,
      email: session.customer_email ?? session.customer_details?.email ?? "",
      status: "PAID",
      totalCents,
      shippingName: session.shipping_details?.name ?? null,
      shippingLine1: shipping?.line1 ?? null,
      shippingLine2: shipping?.line2 ?? null,
      shippingCity: shipping?.city ?? null,
      shippingState: shipping?.state ?? null,
      shippingPostalCode: shipping?.postal_code ?? null,
      shippingCountry: shipping?.country ?? null,
      items: {
        create: cart
          .filter((item) => variantMap[item.variantId])
          .map((item) => {
            const v = variantMap[item.variantId]!;
            return {
              variantId: v.id,
              quantity: item.quantity,
              priceCents: v.priceCents,
            };
          }),
      },
    },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  await routeFulfillment(order);
  return order;
}
