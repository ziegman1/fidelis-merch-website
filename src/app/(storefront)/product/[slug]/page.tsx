import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { AddToCartForm } from "./add-to-cart-form";
import { Badge } from "@/components/ui/badge";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, published: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" }, include: { inventory: true } },
    },
  });
  if (!product) notFound();

  const defaultVariant = product.variants[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square max-h-[500px] bg-zinc-900 rounded-lg overflow-hidden">
          {product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              No image
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            {product.fulfillmentType === "dropship" && (
              <Badge className="bg-zinc-700 text-zinc-300">Dropship</Badge>
            )}
          </div>
          <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">{product.title}</h1>
          {product.description && (
            <p className="mt-4 text-zinc-400 whitespace-pre-wrap">{product.description}</p>
          )}
          <p className="mt-6 text-2xl text-fidelis-gold">
            {defaultVariant ? `$${(defaultVariant.priceCents / 100).toFixed(2)}` : "—"}
          </p>

          {product.variants.length > 1 ? (
            <AddToCartForm
              productId={product.id}
              variants={product.variants}
              defaultVariantId={defaultVariant?.id}
            />
          ) : defaultVariant ? (
            <AddToCartForm
              productId={product.id}
              variants={[defaultVariant]}
              defaultVariantId={defaultVariant.id}
            />
          ) : (
            <p className="text-zinc-500 mt-4">No variants available.</p>
          )}

          {product.fulfillmentType === "self_fulfilled" &&
            defaultVariant?.inventory &&
            defaultVariant.inventory.quantity <= 5 &&
            defaultVariant.inventory.quantity > 0 && (
              <p className="mt-4 text-sm text-fidelis-red">Only {defaultVariant.inventory.quantity} left.</p>
            )}
        </div>
      </div>
    </div>
  );
}
