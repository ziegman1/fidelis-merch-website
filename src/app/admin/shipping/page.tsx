import { prisma } from "@/lib/db";
import { ShippingRatesForm } from "./shipping-rates-form";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const rates = await prisma.shippingRate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide">Shipping</h1>
      <p className="text-zinc-400 max-w-2xl">
        Set flat rates for domestic (US) and international. Customers see these in the cart when they select their country.
      </p>
      <ShippingRatesForm initialRates={rates} />
    </div>
  );
}
