"use client";

import { useEffect } from "react";
import { setCart } from "@/lib/cart-storage";

/**
 * Clears the cart when the order success page is shown.
 * Runs once on mount — the customer has completed purchase and received confirmation.
 */
export function ClearCartOnSuccess() {
  useEffect(() => {
    setCart([]);
  }, []);
  return null;
}
