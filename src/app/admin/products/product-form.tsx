"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Provider, Collection } from "@prisma/client";

type ProductFormProps = {
  action: (formData: FormData) => Promise<void>;
  providers: Provider[];
  collections: Collection[];
  initial?: {
    title: string;
    slug: string;
    description: string | null;
    fulfillmentType: string;
    providerId: string | null;
    published: boolean;
  };
};

export function ProductForm({ action, providers, collections, initial }: ProductFormProps) {
  async function submit(formData: FormData) {
    await action(formData);
  }

  return (
    <form action={submit} className="space-y-6">
      <Card className="border-fidelis-gold/20 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-cream">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title}
              required
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={initial?.slug}
              placeholder="auto-generated from title"
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={4}
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-fidelis-gold/20 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-cream">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentType"
                  value="self_fulfilled"
                  defaultChecked={initial?.fulfillmentType !== "dropship"}
                />
                <span className="text-cream">Self-fulfilled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentType"
                  value="dropship"
                  defaultChecked={initial?.fulfillmentType === "dropship"}
                />
                <span className="text-cream">Dropship</span>
              </label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="providerId">Provider (dropship only)</Label>
            <select
              id="providerId"
              name="providerId"
              defaultValue={initial?.providerId ?? ""}
              className="flex h-10 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-cream"
            >
              <option value="">—</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={initial?.published} />
          <span className="text-cream">Published (visible on storefront)</span>
        </label>
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90">
          {initial ? "Save" : "Create product"}
        </Button>
        <Button type="button" variant="outline" className="border-zinc-600" asChild>
          <Link href="/admin/products">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
