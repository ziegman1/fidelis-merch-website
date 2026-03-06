"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Address = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export function FulfillmentAddressForm() {
  const [address, setAddress] = useState<Address>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/fulfillment-address")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setAddress({
            name: data.name ?? "",
            line1: data.line1 ?? "",
            line2: data.line2 ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            postalCode: data.postalCode ?? "",
            country: data.country ?? "US",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/fulfillment-address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: address.name || null,
          line1: address.line1 || null,
          line2: address.line2 || null,
          city: address.city || null,
          state: address.state || null,
          postalCode: address.postalCode || null,
          country: address.country || "US",
        }),
      });
      if (res.ok) setMessage("Saved.");
      else setMessage("Failed to save.");
    } catch {
      setMessage("Failed to save.");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <Card className="border-fidelis-gold/20 bg-zinc-900 max-w-xl">
      <CardHeader>
        <CardTitle className="text-cream">Default fulfillment address</CardTitle>
        <CardDescription>
          Ship-from address for international orders. Printify does not ship outside the US; you fulfill those from this address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fa-name" className="text-cream">Name / Business</Label>
            <Input
              id="fa-name"
              value={address.name}
              onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fa-line1" className="text-cream">Address line 1</Label>
            <Input
              id="fa-line1"
              value={address.line1}
              onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fa-line2" className="text-cream">Address line 2</Label>
            <Input
              id="fa-line2"
              value={address.line2}
              onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
              className="bg-zinc-800 border-zinc-600"
              placeholder="Apt, suite, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fa-city" className="text-cream">City</Label>
              <Input
                id="fa-city"
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                className="bg-zinc-800 border-zinc-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fa-state" className="text-cream">State / Province</Label>
              <Input
                id="fa-state"
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                className="bg-zinc-800 border-zinc-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fa-postalCode" className="text-cream">Postal code</Label>
              <Input
                id="fa-postalCode"
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                className="bg-zinc-800 border-zinc-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fa-country" className="text-cream">Country</Label>
              <Input
                id="fa-country"
                value={address.country}
                onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                className="bg-zinc-800 border-zinc-600"
                placeholder="US"
              />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message === "Saved." ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
          <Button type="submit" className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90" disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
