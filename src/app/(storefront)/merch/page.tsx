import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { listUnifiedProducts, type UnifiedProduct } from "@/lib/catalog";
import { slugForUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_SLUGS, CATEGORY_LABELS } from "@/data/product-tags";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merch",
  description: "Shop apparel and drinkware from Zieg's on a Mission.",
};

function ProductCard({ p }: { p: UnifiedProduct }) {
  const img = p.primaryImageUrl
    ? { url: p.primaryImageUrl, alt: p.title }
    : p.images[0];
  const priceCents = p.basePriceCents ?? p.variants[0]?.priceCents ?? 0;
  const isPaused = p.paused === true;
  const isComingSoon = p.comingSoon === true;
  const isUnavailable = isPaused || isComingSoon;
  const watermarkText = isComingSoon ? "Coming Soon" : "Out of stock";
  return (
    <Link href={`/product/${slugForUrl(p.slug)}`}>
      <Card className={`border-brand-primary/25 bg-white/90 shadow-sm overflow-hidden hover:border-brand-primary/55 transition-colors h-full ${isUnavailable ? "opacity-60" : ""}`}>
        <div className="aspect-square bg-brand-surface/80 relative">
          <img
            src={img.url}
            alt={img.alt ?? p.title}
            className="w-full h-full object-contain"
          />
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-lg font-semibold text-white/90 uppercase tracking-widest rotate-[-12deg] drop-shadow-lg">
                {watermarkText}
              </span>
            </div>
          )}
          {p.featured && (
            <Badge className="absolute top-2 left-2 bg-brand-accent/90 text-brand-ink text-xs">
              Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium text-brand-ink">{p.title}</h3>
          <p className="text-brand-accent font-medium mt-1">
            {priceCents > 0 ? `$${(priceCents / 100).toFixed(2)}` : "—"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function groupByCategory(products: UnifiedProduct[]): Map<string, UnifiedProduct[]> {
  const order = ["apparel", "drinkware", "uncategorized"];
  const map = new Map<string, UnifiedProduct[]>();
  for (const p of products) {
    const cat = p.category ?? "uncategorized";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const sorted = new Map<string, UnifiedProduct[]>();
  for (const cat of order) {
    const list = map.get(cat);
    if (list?.length) {
      const byFeatured = [...list].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
      sorted.set(cat, byFeatured);
    }
  }
  return sorted;
}

export default async function MerchStorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; featured?: string }>;
}) {
  const { category: categorySlug, q, featured } = await searchParams;

  const isAll = !categorySlug && !featured;
  const isFeatured = featured === "1";
  const isCategoryFilter = categorySlug && CATEGORY_SLUGS.includes(categorySlug as "apparel" | "drinkware");

  let products = await listUnifiedProducts({
    categorySlug: isCategoryFilter ? categorySlug : undefined,
    q: q ?? undefined,
    featured: isFeatured ? true : undefined,
  });

  products = products.filter(
    (p) => p.images?.length > 0 && p.images[0]?.url?.trim()
  );

  const grouped = isAll ? groupByCategory(products) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide mb-8">
        Merch
      </h1>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/merch"
          className={`px-4 py-2 rounded-md text-sm border transition-colors ${
            isAll
              ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
              : "border-brand-primary/40 text-brand-ink/70 hover:border-brand-primary/55"
          }`}
        >
          All
        </Link>
        <Link
          href="/merch?featured=1"
          className={`px-4 py-2 rounded-md text-sm border transition-colors ${
            isFeatured
              ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
              : "border-brand-primary/40 text-brand-ink/70 hover:border-brand-primary/55"
          }`}
        >
          Featured
        </Link>
        {CATEGORY_SLUGS.map((slug) => (
          <Link
            key={slug}
            href={`/merch?category=${slug}`}
            className={`px-4 py-2 rounded-md text-sm border transition-colors ${
              categorySlug === slug
                ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
                : "border-brand-primary/40 text-brand-ink/70 hover:border-brand-primary/55"
            }`}
          >
            {CATEGORY_LABELS[slug]}
          </Link>
        ))}
      </div>

      <Suspense fallback={<div className="text-brand-ink/60">Loading…</div>}>
        {isAll && grouped && grouped.size > 0 ? (
          <div className="space-y-12">
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <section key={cat}>
                <h2 className="font-serif text-xl text-brand-primary tracking-wide mb-6">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {products.length === 0 && (
          <p className="text-brand-ink/60">No products found.</p>
        )}
      </Suspense>
    </div>
  );
}
