import type { Metadata } from "next";
import { CartContent } from "./cart-content";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your cart and checkout at Zieg's on a Mission.",
};

export default function CartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide mb-8">Cart</h1>
      <CartContent />
    </div>
  );
}
