import { CartContent } from "./cart-content";

export default function CartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide mb-8">Cart</h1>
      <CartContent />
    </div>
  );
}
