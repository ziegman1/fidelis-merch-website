"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function OutOfStockToggle({
  productId,
  initialMarkOutOfStock,
  onToggle,
}: {
  productId: string;
  initialMarkOutOfStock: boolean;
  onToggle: (productId: string, markOutOfStock: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    startTransition(() => onToggle(productId, e.target.checked));
  }

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={initialMarkOutOfStock}
            onChange={handleChange}
            disabled={pending}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-brand-primary focus:ring-brand-primary"
          />
          <Label className="text-cream cursor-pointer">
            Mark as out of stock
            {pending && <span className="ml-2 text-zinc-500">(saving…)</span>}
          </Label>
        </label>
        <p className="mt-2 text-sm text-zinc-500">
          When enabled, the product displays an &quot;Out of stock&quot; tag and the Add to cart button is disabled, regardless of inventory.
        </p>
      </CardContent>
    </Card>
  );
}
