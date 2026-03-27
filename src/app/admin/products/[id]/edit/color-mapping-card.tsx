"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getColorFromVariant } from "@/lib/catalog/get-variant-color";

const COLOR_ORDER_DEFAULT = ["Black", "Navy", "Maroon", "Grey", "Light steel", "Gray", "Gold", "Silver", "White"];

type ProductImage = { id: string; url: string; alt: string | null; sortOrder: number };
type Variant = { id: string; name: string | null; options: unknown };

function getUniqueColorsFromVariants(variants: Variant[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const v of variants) {
    const opts = v.options as { name: string; value: string }[] | Record<string, string> | null;
    const optionsArray: { name: string; value: string }[] =
      opts && Array.isArray(opts)
        ? opts
        : opts && typeof opts === "object"
          ? Object.entries(opts).map(([name, value]) => ({ name, value: String(value) }))
          : [];
    const color = getColorFromVariant({ options: optionsArray, name: v.name });
    if (color && !seen.has(color)) {
      seen.add(color);
      result.push(color);
    }
  }
  return result;
}

function sortColorsPreferred(colors: string[]): string[] {
  const order = ["Black", "Navy", "Maroon", "Grey", "Gray", "Light steel", "Gold", "Silver", "White"];
  return [...colors].sort((a, b) => {
    const ai = order.findIndex((o) => a.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(a.toLowerCase()));
    const bi = order.findIndex((o) => b.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(b.toLowerCase()));
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
}

type Props = {
  productId: string;
  productSlug: string;
  images: ProductImage[];
  variants: Variant[];
  initialColorOrder: string[] | null;
  onSaveColorOrder: (productId: string, colorOrder: string[]) => Promise<void>;
};

export function ColorMappingCard({
  productId,
  productSlug,
  images,
  variants,
  initialColorOrder,
  onSaveColorOrder,
}: Props) {
  const uniqueColors = getUniqueColorsFromVariants(variants);
  const sortedColors = sortColorsPreferred(uniqueColors);
  const defaultOrder = initialColorOrder?.length
    ? initialColorOrder
    : sortedColors.length
      ? sortedColors
      : COLOR_ORDER_DEFAULT.filter((c) =>
          uniqueColors.some((u) => u.toLowerCase().includes(c.toLowerCase()))
        );

  const [colorOrderInput, setColorOrderInput] = useState(
    defaultOrder.join(", ")
  );
  const [saving, setSaving] = useState(false);

  const parsedOrder = colorOrderInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveColorOrder(productId, parsedOrder);
    } finally {
      setSaving(false);
    }
  }

  if (images.length === 0 || uniqueColors.length === 0) return null;

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Color-to-thumbnail mapping</CardTitle>
        <CardDescription>
          Match each color to its thumbnail in order. Thumbnail 1 = first color, Thumbnail 2 = second color, etc.
          Reorder images above so they align. This mapping is used on the storefront.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="color-order" className="text-cream">
            Color order (comma-separated, matches thumbnail order)
          </Label>
          <Input
            id="color-order"
            value={colorOrderInput}
            onChange={(e) => setColorOrderInput(e.target.value)}
            placeholder="Black, Navy, Maroon, Light steel"
            className="bg-zinc-800 border-zinc-600"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          {sortedImages.slice(0, 8).map((img, i) => (
            <div key={img.id} className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded border border-zinc-600 overflow-hidden bg-zinc-800">
                <img
                  src={img.url}
                  alt={img.alt ?? "Thumbnail"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs text-zinc-500">
                #{i + 1} = {parsedOrder[i] ?? "—"}
              </span>
            </div>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90"
          onClick={handleSave}
          disabled={saving || parsedOrder.length === 0}
        >
          {saving ? "Saving…" : "Save color mapping"}
        </Button>
      </CardContent>
    </Card>
  );
}
