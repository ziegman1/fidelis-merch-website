"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PRODUCT_TAGS,
  TAG_LABELS,
  type ProductTag,
} from "@/data/product-tags";

type Props = {
  productId: string;
  initialTags: string[];
  onSave: (productId: string, tags: string[]) => Promise<void>;
};

export function ProductTagsCard({ productId, initialTags, onSave }: Props) {
  const router = useRouter();

  async function handleChange(tag: ProductTag, checked: boolean) {
    const next = checked
      ? [...new Set([...initialTags, tag])]
      : initialTags.filter((t) => t !== tag);
    await onSave(productId, next);
    router.refresh();
  }

  return (
    <Card className="border-brand-primary/25 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-cream">Tags & Categories</CardTitle>
        <p className="text-sm text-zinc-500">
          Tags control store filters (All, Featured, Apparel, Drinkware). Featured items appear when &quot;Featured&quot; is selected.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {(Object.keys(PRODUCT_TAGS) as (keyof typeof PRODUCT_TAGS)[]).map(
            (key) => {
              const tag = PRODUCT_TAGS[key];
              const checked = initialTags.includes(tag);
              return (
                <label
                  key={tag}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleChange(tag, e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-cream">{TAG_LABELS[tag]}</span>
                </label>
              );
            }
          )}
        </div>
      </CardContent>
    </Card>
  );
}
