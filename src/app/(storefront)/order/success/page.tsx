import { redirect } from "next/navigation";
import Link from "next/link";
import { createOrderFromSession } from "@/lib/orders";

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
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide mb-4">
        Thank you for your order
      </h1>
      <p className="text-zinc-400 mb-2">
        Order confirmation has been sent to <strong className="text-cream">{order?.email}</strong>.
      </p>
      {order && (
        <p className="text-sm text-zinc-500 mb-8">
          Order ID: <span className="font-mono">{order.id}</span>
        </p>
      )}
      <Button asChild className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}
