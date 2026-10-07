import Link from "next/link";
import { listUnifiedProducts } from "@/lib/catalog";
import { slugForUrl } from "@/lib/utils";
import { CATEGORY_SLUGS, CATEGORY_LABELS } from "@/data/product-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  apparel: "T-shirts, hoodies, polos, and more",
  drinkware: "Tumblers, mugs, and drinkware",
};

export default async function HomePage() {
  const featuredProducts = await listUnifiedProducts({ featured: true });
  const productsWithImages = featuredProducts.filter(
    (p) => p.images?.length > 0 && p.images[0]?.url?.trim()
  );

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

      {/* Collections — Apparel & Drinkware */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-serif text-2xl text-fidelis-gold tracking-wide mb-8">Collections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CATEGORY_SLUGS.map((slug) => (
            <Link key={slug} href={`/shop?category=${slug}`}>
              <Card className="border-fidelis-gold/20 bg-zinc-900 overflow-hidden hover:border-fidelis-gold/50 transition-colors h-full">
                <CardContent className="p-6">
                  <h3 className="font-medium text-cream">{CATEGORY_LABELS[slug]}</h3>
                  {CATEGORY_DESCRIPTIONS[slug] && (
                    <p className="text-sm text-zinc-500 mt-1">{CATEGORY_DESCRIPTIONS[slug]}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products — links to product detail (description & quantity selection) */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-serif text-2xl text-fidelis-gold tracking-wide mb-8">Featured</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productsWithImages.map((p) => {
            const img = p.primaryImageUrl
              ? { url: p.primaryImageUrl, alt: p.title }
              : p.images[0];
            const priceCents = p.basePriceCents ?? p.variants[0]?.priceCents ?? 0;
            const isPaused = p.paused === true;
            const isComingSoon = p.comingSoon === true;
            const isUnavailable = isPaused || isComingSoon;
            const watermarkText = isComingSoon ? "Coming Soon" : "Out of stock";
            return (
              <Link
                key={p.id}
                href={`/product/${slugForUrl(p.slug)}`}
                className="block h-full"
              >
                <Card className={`border-fidelis-gold/20 bg-zinc-900 overflow-hidden hover:border-fidelis-gold/50 transition-colors h-full ${isUnavailable ? "opacity-60" : ""}`}>
                  <div className="aspect-square bg-zinc-800 relative">
                    {img ? (
                      <img
                        src={img.url}
                        alt={img.alt ?? p.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                        No image
                      </span>
                    )}
                    {isUnavailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-lg font-semibold text-white/90 uppercase tracking-widest rotate-[-12deg] drop-shadow-lg">
                          {watermarkText}
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-cream">{p.title}</h3>
                    <p className="text-fidelis-gold mt-1">
                      {priceCents > 0 ? `$${(priceCents / 100).toFixed(2)}` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        {productsWithImages.length === 0 && (
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
