"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShippingRate } from "@prisma/client";

export function ShippingRatesForm({
  initialRates,
}: {
  initialRates: ShippingRate[];
}) {
  const [rates, setRates] = useState(
    initialRates.map((r) => ({
      id: r.id,
      zoneType: r.zoneType,
      name: r.name,
      priceCents: r.priceCents,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates }),
      });
      if (res.ok) setMessage("Saved.");
      else setMessage("Failed to save.");
    } catch {
      setMessage("Failed to save.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-brand-primary/25 bg-zinc-900 max-w-xl">
        <CardHeader>
          <CardTitle className="text-cream">Rates by zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {rates.map((r, i) => (
            <div key={r.id} className="space-y-2">
              <Label className="text-cream capitalize">
                {r.zoneType === "domestic_us" ? "Domestic (US)" : "International"}
              </Label>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor={`name-${r.id}`} className="text-zinc-500 text-xs">
                    Label
                  </Label>
                  <Input
                    id={`name-${r.id}`}
                    value={r.name}
                    onChange={(e) => {
                      const next = [...rates];
                      next[i] = { ...next[i], name: e.target.value };
                      setRates(next);
                    }}
                    className="bg-zinc-800 border-zinc-600 mt-1"
                  />
                </div>
                <div className="w-28">
                  <Label htmlFor={`price-${r.id}`} className="text-zinc-500 text-xs">
                    Price ($)
                  </Label>
                  <Input
                    id={`price-${r.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={(r.priceCents / 100).toFixed(2)}
                    onChange={(e) => {
                      const next = [...rates];
                      next[i] = {
                        ...next[i],
                        priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                      };
                      setRates(next);
                    }}
                    className="bg-zinc-800 border-zinc-600 mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
          {message && (
            <p className={`text-sm ${message === "Saved." ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
          <Button type="submit" className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90" disabled={saving}>
            {saving ? "Saving…" : "Save shipping rates"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
