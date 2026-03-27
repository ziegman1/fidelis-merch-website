"use client";

import { useState } from "react";

const GREY_ALIASES = ["grey", "gray", "light steel"];
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

function parseVariantName(name: string | null): { color: string; size: string } {
  if (!name?.trim()) return { color: "", size: "" };
  const parts = name.split(/\s*\/\s*/).map((p) => p.trim());
  return { color: parts[0] ?? "", size: parts[1] ?? "" };
}

function getColorSortIndex(color: string): number {
  const lower = color.toLowerCase();
  if (lower === "black") return 0;
  if (lower.startsWith("navy")) return 1;
  if (lower === "maroon") return 2;
  if (GREY_ALIASES.some((a) => lower.includes(a))) return 3;
  return 4;
}

function getSizeSortIndex(size: string): number {
  const upper = size.toUpperCase().replace(/\s/g, "");
  const idx = SIZE_ORDER.findIndex((s) => s.toUpperCase() === upper || upper === s);
  return idx >= 0 ? idx : SIZE_ORDER.length;
}

function sortVariantsByColorAndSize<T extends { name: string | null }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const aParts = parseVariantName(a.name);
    const bParts = parseVariantName(b.name);
    const colorA = getColorSortIndex(aParts.color);
    const colorB = getColorSortIndex(bParts.color);
    if (colorA !== colorB) return colorA - colorB;
    return getSizeSortIndex(aParts.size) - getSizeSortIndex(bParts.size);
  });
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addVariant, updateVariant, updateVariantInventory, deleteVariant } from "./variant-editor-actions";

type Variant = {
  id: string;
  productId: string;
  name: string | null;
  sku: string | null;
  priceCents: number;
  sortOrder: number;
  imageOverride: string | null;
  inventory?: { quantity: number } | null;
};

type Props = {
  productId: string;
  variants: Variant[];
  fulfillmentType: string;
};

export function VariantEditorCard({ productId, variants: initialVariants, fulfillmentType }: Props) {
  const [variants, setVariants] = useState(initialVariants);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd(
    name: string,
    priceCents: number,
    sku?: string,
    imageOverride?: string,
    quantity?: number
  ) {
    const result = await addVariant(
      productId,
      name,
      priceCents,
      sku,
      fulfillmentType,
      imageOverride,
      quantity
    );
    if (result?.id) {
      setVariants((v) => [
        ...v,
        {
          id: result.id,
          productId,
          name: name.trim() || "Default",
          sku: sku ?? null,
          priceCents,
          sortOrder: v.length,
          imageOverride: imageOverride?.trim() || null,
          inventory:
            fulfillmentType === "self_fulfilled" && quantity != null
              ? { quantity }
              : undefined,
        },
      ]);
      setAdding(false);
    }
  }

  async function handleUpdate(
    variantId: string,
    data: {
      name?: string;
      priceCents?: number;
      sku?: string;
      imageOverride?: string;
      quantity?: number;
    }
  ) {
    const { quantity, ...variantData } = data;
    await updateVariant(variantId, variantData);
    if (fulfillmentType === "self_fulfilled" && quantity !== undefined) {
      await updateVariantInventory(variantId, quantity);
    }
    setVariants((v) =>
      v.map((x) =>
        x.id === variantId
          ? {
              ...x,
              ...variantData,
              ...(quantity !== undefined &&
                fulfillmentType === "self_fulfilled" && {
                  inventory: { quantity },
                }),
            }
          : x
      )
    );
    setEditingId(null);
  }

  async function handleDelete(variantId: string) {
    await deleteVariant(variantId);
    setVariants((v) => v.filter((x) => x.id !== variantId));
  }

  const displayedVariants = sortVariantsByColorAndSize(variants);

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Variants ({variants.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {displayedVariants.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-4 rounded border border-zinc-700 p-3"
            >
              {editingId === v.id ? (
                <VariantEditForm
                  variant={v}
                  fulfillmentType={fulfillmentType}
                  onSave={(data) => handleUpdate(v.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {v.imageOverride ? (
                      <div className="w-12 h-12 shrink-0 rounded border border-zinc-600 overflow-hidden bg-zinc-800">
                        <img
                          src={v.imageOverride}
                          alt={v.name ?? "Variant"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 shrink-0 rounded border border-zinc-600 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                        No img
                      </div>
                    )}
                    <span className="text-cream truncate">
                      {v.name ?? v.sku ?? v.id} - ${(v.priceCents / 100).toFixed(2)}
                      {fulfillmentType === "self_fulfilled" && (
                        <span className="ml-2 text-zinc-500 text-sm">
                          (Qty: {v.inventory?.quantity ?? 0})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => setEditingId(v.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(v.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {adding ? (
          <VariantAddForm
            fulfillmentType={fulfillmentType}
            onAdd={(name, priceCents, sku, imageOverride, quantity) =>
              handleAdd(name, priceCents, sku, imageOverride, quantity)
            }
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-brand-primary/50"
            onClick={() => setAdding(true)}
          >
            Add variant
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function VariantEditForm({
  variant,
  fulfillmentType,
  onSave,
  onCancel,
}: {
  variant: Variant;
  fulfillmentType: string;
  onSave: (data: {
    name?: string;
    priceCents?: number;
    sku?: string;
    imageOverride?: string;
    quantity?: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(variant.name ?? "");
  const [price, setPrice] = useState(String(variant.priceCents / 100));
  const [sku, setSku] = useState(variant.sku ?? "");
  const [imageOverride, setImageOverride] = useState(variant.imageOverride ?? "");
  const [quantity, setQuantity] = useState(
    String(variant.inventory?.quantity ?? 0)
  );

  return (
    <div className="flex flex-wrap items-end gap-4 w-full">
      <div className="grid gap-1 min-w-[120px]">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="grid gap-1 w-24">
        <Label>Price</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      {fulfillmentType === "self_fulfilled" && (
        <div className="grid gap-1 w-20">
          <Label>Qty</Label>
          <Input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-zinc-800 border-zinc-600"
          />
        </div>
      )}
      <div className="grid gap-1 min-w-[100px]">
        <Label>SKU</Label>
        <Input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="grid gap-1 min-w-[200px]">
        <Label>Image URL</Label>
        <Input
          type="url"
          value={imageOverride}
          onChange={(e) => setImageOverride(e.target.value)}
          placeholder="https://..."
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              name: name.trim() || undefined,
              priceCents: Math.round(parseFloat(price || "0") * 100),
              sku: sku.trim() || undefined,
              imageOverride: imageOverride.trim() || undefined,
              ...(fulfillmentType === "self_fulfilled" && {
                quantity: Math.max(0, parseInt(quantity, 10) || 0),
              }),
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-zinc-600">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function VariantAddForm({
  fulfillmentType,
  onAdd,
  onCancel,
}: {
  fulfillmentType: string;
  onAdd: (
    name: string,
    priceCents: number,
    sku?: string,
    imageOverride?: string,
    quantity?: number
  ) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [imageOverride, setImageOverride] = useState("");
  const [quantity, setQuantity] = useState("0");

  return (
    <div className="flex flex-wrap items-end gap-4 rounded border border-zinc-700 p-3">
      <div className="grid gap-1 min-w-[120px]">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Black"
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="grid gap-1 w-24">
        <Label>Price</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      {fulfillmentType === "self_fulfilled" && (
        <div className="grid gap-1 w-20">
          <Label>Qty</Label>
          <Input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-600"
          />
        </div>
      )}
      <div className="grid gap-1 min-w-[100px]">
        <Label>SKU</Label>
        <Input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="optional"
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="grid gap-1 min-w-[200px]">
        <Label>Image URL</Label>
        <Input
          type="url"
          value={imageOverride}
          onChange={(e) => setImageOverride(e.target.value)}
          placeholder="https://..."
          className="bg-zinc-800 border-zinc-600"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || !price}
          onClick={() =>
            onAdd(
              name.trim(),
              Math.round(parseFloat(price || "0") * 100),
              sku.trim() || undefined,
              imageOverride.trim() || undefined,
              fulfillmentType === "self_fulfilled"
                ? Math.max(0, parseInt(quantity, 10) || 0)
                : undefined
            )
          }
        >
          Add
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-zinc-600">
          Cancel
        </Button>
      </div>
    </div>
  );
}
