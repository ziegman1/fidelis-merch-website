import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      fulfillments: { include: { provider: true, items: true } },
    },
  });
  if (!order) notFound();

  let defaultAddress = null;
  try {
    defaultAddress = await prisma.defaultFulfillmentAddress.findFirst();
  } catch {
    // DefaultFulfillmentAddress table may not exist yet if migration not applied
  }

  const isInternational = (order.shippingCountry ?? "").toUpperCase() !== "US";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-brand-primary tracking-wide">
          Order {order.id.slice(0, 8)}…
        </h1>
        <Button asChild variant="outline" size="sm" className="border-brand-primary/50">
          <Link href="/admin/orders">Back to orders</Link>
        </Button>
      </div>
      <div className="rounded-md border border-zinc-700 p-6 space-y-4">
        <p><span className="text-zinc-500">Email:</span> {order.email}</p>
        <p><span className="text-zinc-500">Status:</span> <Badge>{order.status}</Badge></p>
        <p><span className="text-zinc-500">Total:</span> ${(order.totalCents / 100).toFixed(2)}</p>
        <p><span className="text-zinc-500">Shipping:</span> {order.shippingName ?? "—"}, {order.shippingLine1 ?? ""} {order.shippingCity ?? ""} {order.shippingState ?? ""} {order.shippingPostalCode ?? ""}</p>
      </div>
      <div>
        <h2 className="font-medium text-cream mb-2">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((oi) => (
            <li key={oi.id} className="text-zinc-400">
              {oi.variant.product.title} — {oi.variant.name ?? oi.variant.sku} × {oi.quantity} @ ${(oi.priceCents / 100).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
      {order.fulfillments.length > 0 && (
        <div>
          <h2 className="font-medium text-cream mb-2">Fulfillments</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {order.fulfillments.map((f) => (
              <li key={f.id}>
                {f.provider?.name ?? "Manual (you fulfill)"} — {f.status}
                {f.externalOrderId && ` (external: ${f.externalOrderId})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isInternational && (
        <div className="rounded-md border border-brand-primary/35 bg-zinc-900 p-4 space-y-4">
          <p className="text-sm text-zinc-400">
            Printify does not ship internationally. Printify was sent your default address so the item ships to you; use the customer address below when you forward the package.
          </p>
          <div>
            <h2 className="font-medium text-brand-primary mb-1">Printify ships to (your default address)</h2>
            {defaultAddress ? (
              <address className="text-sm text-cream not-italic">
                {defaultAddress.name && <span className="block">{defaultAddress.name}</span>}
                {defaultAddress.line1 && <span className="block">{defaultAddress.line1}</span>}
                {defaultAddress.line2 && <span className="block">{defaultAddress.line2}</span>}
                {(defaultAddress.city || defaultAddress.state || defaultAddress.postalCode) && (
                  <span className="block">
                    {[defaultAddress.city, defaultAddress.state, defaultAddress.postalCode].filter(Boolean).join(", ")}
                  </span>
                )}
                {defaultAddress.country && <span className="block">{defaultAddress.country}</span>}
              </address>
            ) : (
              <p className="text-sm text-zinc-500">No default address set. Add one in Admin → Settings.</p>
            )}
          </div>
          <div>
            <h2 className="font-medium text-brand-primary mb-1">Ship to customer (for your records — use when you forward)</h2>
            <address className="text-sm text-cream not-italic">
              {order.shippingName && <span className="block">{order.shippingName}</span>}
              {order.shippingLine1 && <span className="block">{order.shippingLine1}</span>}
              {order.shippingLine2 && <span className="block">{order.shippingLine2}</span>}
              {(order.shippingCity || order.shippingState || order.shippingPostalCode) && (
                <span className="block">
                  {[order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", ")}
                </span>
              )}
              {order.shippingCountry && <span className="block">{order.shippingCountry}</span>}
            </address>
          </div>
        </div>
      )}
    </div>
  );
}
