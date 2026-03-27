"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCart, CART_KEY } from "@/lib/cart-storage";

export function CartLink({ className }: { className?: string }) {
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
      className={cn(
        "text-brand-primary hover:text-brand-accent transition-colors inline-flex items-center gap-1.5",
        className,
      )}
      aria-label={count > 0 ? `Cart (${count} items)` : "Cart"}
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span
          className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-brand-accent text-brand-ink text-xs font-semibold"
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
