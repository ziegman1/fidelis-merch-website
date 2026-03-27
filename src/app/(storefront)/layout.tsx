import Link from "next/link";
import Image from "next/image";
import { CartLink } from "@/components/cart-link";
import { PageViewTracker } from "@/components/page-view-tracker";
import { getSiteCopy } from "@/lib/site-copy";

const FOOTER_LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns" },
] as const;

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const copy = await getSiteCopy();
  const navMain = copy.navLinks.filter((l) => l.href !== "/");

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface text-brand-ink">
      <PageViewTracker />
      <header className="border-b border-white/30 sticky top-0 z-50 bg-brand-primary shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-h-[4.5rem] sm:min-h-20 py-3 sm:py-2">
          <Link
            href="/"
            aria-label={`Home — ${copy.site.name}`}
            className="flex items-center shrink-0 py-1"
          >
            <Image
              src="/logo/team-expansion.png"
              alt="Team Expansion"
              width={768}
              height={276}
              className="h-12 w-auto sm:h-[3.3rem] max-w-[min(100%,min(312px,85vw))] object-contain object-left drop-shadow-sm"
              priority
              unoptimized
            />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6 justify-start sm:justify-end">
            {copy.navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs sm:text-sm text-white hover:text-white/90 transition-colors whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
            <CartLink className="text-white hover:text-white/90 transition-colors inline-flex items-center gap-1.5" />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-brand-primary/25 bg-white/40 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-brand-ink/80">
          <p className="font-serif text-lg text-brand-primary tracking-wide">{copy.site.name}</p>
          <p className="mt-2 max-w-lg mx-auto leading-relaxed">{copy.footer.blurb}</p>
          <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-brand-ink/90">
            {navMain.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-brand-primary transition-colors">
                {label}
              </Link>
            ))}
            {FOOTER_LEGAL.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-brand-primary transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-brand-ink/60">
            © {new Date().getFullYear()} {copy.site.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
