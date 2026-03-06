import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredProducts, featuredCollections] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { take: 1 } },
      take: 4,
    }),
    prisma.collection.findMany({
      where: { featured: true },
      take: 4,
    }),
  ]);

  return (
    <div>
      {/* Hero — logo fills 2/3; full image shown (no crop) using native img for reliable sizing */}
      <section className="relative flex flex-col min-h-[85vh] px-4 text-center border-b border-fidelis-gold/20">
        <div className="flex-[2] flex items-center justify-center py-8">
          <div className="w-full max-w-2xl mx-auto" style={{ minHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/fidelis-hero.png"
              alt="Fidelis International Seminary — JUDE 1:3"
              className="w-full h-auto max-h-[66vh] object-contain object-center block mx-auto"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="flex-[1] flex flex-col items-center justify-center pb-12">
          <p className="text-xl text-zinc-400 max-w-xl mx-auto">
            Official merchandise for Fidelis International Seminary
          </p>
          <Button asChild className="mt-8 bg-fidelis-gold text-black hover:bg-fidelis-gold/90">
            <Link href="/shop">Shop now</Link>
          </Button>
        </div>
      </section>

      {/* Featured collections */}
      {featuredCollections.length > 0 && (
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <h2 className="font-serif text-2xl text-fidelis-gold tracking-wide mb-8">Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCollections.map((c) => (
              <Link key={c.id} href={`/shop?collection=${c.slug}`}>
                <Card className="border-fidelis-gold/20 bg-zinc-900 overflow-hidden hover:border-fidelis-gold/50 transition-colors">
                  <CardContent className="p-6">
                    <h3 className="font-medium text-cream">{c.name}</h3>
                    {c.description && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{c.description}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-serif text-2xl text-fidelis-gold tracking-wide mb-8">Featured</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p) => {
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
        {featuredProducts.length === 0 && (
          <p className="text-zinc-500">No featured products yet.</p>
        )}
      </section>

      {/* Mission */}
      <section className="py-16 px-4 border-t border-fidelis-gold/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl text-fidelis-gold tracking-wide mb-4">Our mission</h2>
          <p className="text-zinc-400">
            Supporting Fidelis International Seminary through quality merchandise that reflects our heritage and commitment to faithful ministry.
          </p>
        </div>
      </section>
    </div>
  );
}
