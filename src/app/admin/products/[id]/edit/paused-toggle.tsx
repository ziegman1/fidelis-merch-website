"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AvailabilityOverride = "active" | "paused" | "coming_soon";

export function PausedToggle({
  productId,
  initialPaused,
  initialComingSoon,
  onToggle,
}: {
  productId: string;
  initialPaused: boolean;
  initialComingSoon: boolean;
  onToggle: (productId: string, paused: boolean, comingSoon: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  const value: AvailabilityOverride = initialComingSoon
    ? "coming_soon"
    : initialPaused
      ? "paused"
      : "active";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as AvailabilityOverride;
    startTransition(() =>
      onToggle(productId, v === "paused", v === "coming_soon")
    );
  }

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="availability">Status</Label>
          <select
            id="availability"
            value={value}
            onChange={handleChange}
            disabled={pending}
            className="flex h-10 w-full max-w-xs rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-cream"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="coming_soon">Coming Soon</option>
          </select>
          {pending && <span className="text-sm text-zinc-500">Saving…</span>}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          <strong>Paused:</strong> Product card is faded with &quot;Out of stock&quot; watermark. Customers can view the product but cannot add to cart. Use for products with issues.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          <strong>Coming Soon:</strong> Product card is faded with &quot;Coming Soon&quot; watermark. Customers can view the product but cannot add to cart. Use for upcoming products.
        </p>
      </CardContent>
    </Card>
  );
}
