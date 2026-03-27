import { redirect } from "next/navigation";
import Link from "next/link";
import { createOrderFromSession } from "@/lib/orders";
import { ClearCartOnSuccess } from "./clear-cart-on-success";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/");

  let order = null;
  try {
    order = await createOrderFromSession(session_id);
  } catch (e) {
    console.error("Order creation from session failed:", e);
    redirect("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <ClearCartOnSuccess />
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide mb-4">
        Thank you for your order
      </h1>
      <p className="text-brand-ink/75 mb-2">
        Order confirmation has been sent to <strong className="text-brand-ink">{order?.email}</strong>.
      </p>
      {order && (
        <p className="text-sm text-brand-ink/60 mb-8">
          Order ID: <span className="font-mono">{order.id}</span>
        </p>
      )}
      <Button asChild className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90">
        <Link href="/merch">Continue shopping</Link>
      </Button>
    </div>
  );
}
