import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; q?: string }>;
}) {
  const { collection: collectionSlug, q } = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      published: true,
      ...(collectionSlug && {
        collections: { some: { collection: { slug: collectionSlug } } },
      }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide mb-8">Shop</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/shop"
          className={`px-4 py-2 rounded-md text-sm border transition-colors ${
            !collectionSlug
              ? "bg-fidelis-gold/20 border-fidelis-gold text-fidelis-gold"
              : "border-zinc-600 text-zinc-400 hover:border-fidelis-gold/50"
          }`}
        >
          All
        </Link>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/shop?collection=${c.slug}`}
            className={`px-4 py-2 rounded-md text-sm border transition-colors ${
              collectionSlug === c.slug
                ? "bg-fidelis-gold/20 border-fidelis-gold text-fidelis-gold"
                : "border-zinc-600 text-zinc-400 hover:border-fidelis-gold/50"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => {
            const img = p.images[0];
            const variant = p.variants[0];
            return (
              <Link key={p.id} href={`/product/${p.slug}`}>
                <Card className="border-fidelis-gold/20 bg-zinc-900 overflow-hidden hover:border-fidelis-gold/50 transition-colors h-full">
                  <div className="aspect-square bg-zinc-800 relative">
                    {img ? (
                      <img
                        src={img.url}
                        alt={img.alt ?? p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                        No image
                      </span>
                    )}
                    {p.fulfillmentType === "dropship" && (
                      <Badge className="absolute top-2 right-2 bg-zinc-800/90 text-xs">Dropship</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-cream">{p.title}</h3>
                    <p className="text-fidelis-gold mt-1">
                      {variant ? `$${(variant.priceCents / 100).toFixed(2)}` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        {products.length === 0 && (
          <p className="text-zinc-500">No products found.</p>
        )}
      </Suspense>
    </div>
  );
}
