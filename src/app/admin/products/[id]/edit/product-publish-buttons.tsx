"use client";

import { Button } from "@/components/ui/button";
import {
  publishProduct,
  unpublishProduct,
  archiveProduct,
  unarchiveProduct,
} from "./product-publish-actions-client";

type Product = { id: string; slug: string; status: string };

export function ProductPublishButtons({ product }: { product: Product }) {
  return (
    <div className="flex gap-2">
      <form action={publishProduct}>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="slug" value={product.slug} />
        <Button
          type="submit"
          size="sm"
          disabled={product.status === "PUBLISHED"}
          className="bg-green-800 hover:bg-green-700"
        >
          Publish
        </Button>
      </form>
      <form action={unpublishProduct}>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="slug" value={product.slug} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={product.status !== "PUBLISHED"}
          className="border-zinc-600"
        >
          Unpublish
        </Button>
      </form>
      <form action={archiveProduct}>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="slug" value={product.slug} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={product.status === "ARCHIVED"}
          className="border-amber-600 text-amber-400"
        >
          Archive
        </Button>
      </form>
      <form action={unarchiveProduct}>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="slug" value={product.slug} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={product.status !== "ARCHIVED"}
          className="border-zinc-600"
        >
          Unarchive
        </Button>
      </form>
    </div>
  );
}
