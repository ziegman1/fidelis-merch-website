import Link from "next/link";
import { Dancing_Script } from "next/font/google";
import { listUnifiedProducts } from "@/lib/catalog";
import { slugForUrl } from "@/lib/utils";
import { CATEGORY_SLUGS, CATEGORY_LABELS } from "@/data/product-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteCopy, homeHeroWithHrefs } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const heroTitle = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  apparel: "T-shirts, hoodies, polos, and more",
  drinkware: "Tumblers, mugs, and drinkware",
};

export default async function HomePage() {
  const copy = await getSiteCopy();
  const hero = homeHeroWithHrefs(copy);
  const featuredProducts = await listUnifiedProducts({ featured: true });
  const productsWithImages = featuredProducts.filter(
    (p) => p.images?.length > 0 && p.images[0]?.url?.trim(),
  );

  return (
    <div>
      {/* Hero — image: subjects right; text left; soft fade matches brand surface */}
      <section className="relative min-h-[min(90vh,52rem)] flex items-stretch border-b border-brand-primary/20">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-zieg-mission.png"
            alt=""
            className="w-full h-full object-cover object-[center_22%] sm:object-center"
            fetchPriority="high"
          />
          {/* Lighter on the right so subjects stay vivid; text side still softened */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(234_229_225/0.48)_0%,rgb(234_229_225/0.09)_28%,transparent_52%)] sm:bg-[linear-gradient(to_right,rgb(234_229_225/0.4)_0%,rgb(234_229_225/0.05)_26%,transparent_48%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-surface/22 via-transparent to-transparent sm:from-brand-surface/12 pointer-events-none" />
          {/* Stronger wash behind hero copy — same position, higher contrast for text */}
          <div
            className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_100%_72%_at_22%_48%,rgb(234_229_225/0.24)_0%,rgb(234_229_225/0.08)_42%,transparent_62%)] sm:bg-[radial-gradient(ellipse_90%_62%_at_20%_46%,rgb(234_229_225/0.2)_0%,rgb(234_229_225/0.06)_40%,transparent_58%)]"
            aria-hidden
          />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 sm:py-24 flex flex-col justify-center min-h-[min(90vh,52rem)]">
          <div className="max-w-[min(100%,calc(36rem-75px))] text-left -translate-y-[50px]">
            <h1
              className={`${heroTitle.className} text-[2.25rem] sm:text-4xl md:text-5xl lg:text-[3.25rem] text-brand-ink font-bold tracking-normal leading-[1.15] [text-shadow:0_1px_0_rgba(255,255,255,0.65),0_2px_12px_rgba(255,255,255,0.45),0_0.5px_0_rgba(30,54,68,0.55)]`}
            >
              {hero.headline}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-brand-ink leading-relaxed max-w-prose [text-shadow:0_1px_2px_rgba(255,255,255,0.85),0_0_1px_rgba(255,255,255,0.5)]">
              {hero.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full px-7 h-12 bg-brand-accent text-brand-ink hover:bg-brand-accent/90 font-semibold shadow-md"
              >
                <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-7 h-12 border-brand-primary/50 text-brand-ink bg-white/80 hover:bg-white"
              >
                <Link href={hero.secondaryCta.href}>{hero.secondaryCta.label}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-brand-primary/25 bg-white/90 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-serif text-xl text-brand-primary tracking-wide mb-3">
                {copy.home.whoTitle}
              </h2>
              <p className="text-brand-ink/85 leading-relaxed">{copy.home.whoBody}</p>
              <Link
                href="/about"
                className="inline-block mt-4 text-brand-primary font-medium hover:underline"
              >
                {copy.home.whoCta}
              </Link>
            </CardContent>
          </Card>
          <Card className="border-brand-primary/25 bg-white/90 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-serif text-xl text-brand-primary tracking-wide mb-3">
                {copy.home.whyTitle}
              </h2>
              <p className="text-brand-ink/85 leading-relaxed">{copy.home.whyBody}</p>
              <Link
                href="/mission"
                className="inline-block mt-4 text-brand-primary font-medium hover:underline"
              >
                {copy.home.whyCta}
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-14 px-4 max-w-7xl mx-auto border-t border-brand-primary/15">
        <h2 className="font-serif text-2xl text-brand-primary tracking-wide mb-2">
          {copy.home.merchTitle}
        </h2>
        <p className="text-brand-ink/75 mb-8 max-w-2xl">{copy.home.merchBlurb}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CATEGORY_SLUGS.map((slug) => (
            <Link key={slug} href={`/merch?category=${slug}`}>
              <Card className="border-brand-primary/25 bg-white/90 shadow-sm overflow-hidden hover:border-brand-primary/55 transition-colors h-full">
                <CardContent className="p-6">
                  <h3 className="font-medium text-brand-ink">{CATEGORY_LABELS[slug]}</h3>
                  {CATEGORY_DESCRIPTIONS[slug] && (
                    <p className="text-sm text-brand-ink/70 mt-1">{CATEGORY_DESCRIPTIONS[slug]}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-14 px-4 max-w-7xl mx-auto">
        <h2 className="font-serif text-2xl text-brand-primary tracking-wide mb-8">
          {copy.home.featuredTitle}
        </h2>
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
              <Link key={p.id} href={`/product/${slugForUrl(p.slug)}`} className="block h-full">
                <Card
                  className={`border-brand-primary/25 bg-white/90 shadow-sm overflow-hidden hover:border-brand-primary/55 transition-colors h-full ${isUnavailable ? "opacity-60" : ""}`}
                >
                  <div className="aspect-square bg-brand-surface/80 relative">
                    {img ? (
                      <img
                        src={img.url}
                        alt={img.alt ?? p.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-brand-ink/40 text-sm">
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
                    <h3 className="font-medium text-brand-ink">{p.title}</h3>
                    <p className="text-brand-accent mt-1 font-medium">
                      {priceCents > 0 ? `$${(priceCents / 100).toFixed(2)}` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        {productsWithImages.length === 0 && (
          <p className="text-brand-ink/60">{copy.home.featuredEmpty}</p>
        )}
        <p className="mt-10 text-center">
          <Link
            href="/merch"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            {copy.home.viewAllMerchLabel}
          </Link>
        </p>
      </section>
    </div>
  );
}
