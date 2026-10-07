"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCart, CART_KEY } from "@/lib/cart-storage";

export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const cart = getCart();
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCount(total);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) update();
    };
    update();
    window.addEventListener("fidelis-cart-update", update);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("fidelis-cart-update", update);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="text-fidelis-gold hover:text-fidelis-gold/90 transition-colors inline-flex items-center gap-1.5"
      aria-label={count > 0 ? `Cart (${count} items)` : "Cart"}
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span
          className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-fidelis-gold text-black text-xs font-semibold"
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
