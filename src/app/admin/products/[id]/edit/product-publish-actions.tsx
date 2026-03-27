import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPublishButtons } from "./product-publish-buttons";
import type { ProductStatus } from "@prisma/client";

type Product = { id: string; slug: string; title: string; status: ProductStatus };

export async function ProductPublishActions({ product }: { product: Product }) {
  const admin = await requireAdminSession();
  if (!admin) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-zinc-700 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Status</span>
        <Badge
          variant={product.status === "PUBLISHED" ? "default" : "outline"}
          className={
            product.status === "PUBLISHED"
              ? "bg-green-900/50 text-green-300"
              : product.status === "ARCHIVED"
                ? "border-amber-600 text-amber-400"
                : "border-zinc-500 text-zinc-400"
          }
        >
          {product.status}
        </Badge>
      </div>
      <ProductPublishButtons product={product} />
      {product.status === "DRAFT" && (
        <Button asChild variant="outline" size="sm" className="border-brand-primary/50">
          <Link href={`/admin/products/${product.id}/preview`}>Preview</Link>
        </Button>
      )}
    </div>
  );
}
