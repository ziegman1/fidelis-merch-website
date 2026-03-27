import type { Metadata } from "next";
import Link from "next/link";
import { MinistryPageShell } from "@/components/ministry-page-shell";
import { getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "Mission",
    description: `The heart of ${copy.site.name} — gospel advance, partnership, and how merch supports the work.`,
  };
}

export default async function MissionPage() {
  const copy = await getSiteCopy();
  const { title, lede, focusHeading, bullets, merchHeading, merchBody } = copy.mission;

  return (
    <MinistryPageShell title={title} lede={lede}>
      <section>
        <h2>{focusHeading}</h2>
        <ul>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{merchHeading}</h2>
        <p>{merchBody}</p>
      </section>
      <div className="!mt-10 flex flex-wrap gap-3 not-prose">
        <Link
          href="/merch"
          className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-brand-accent text-brand-ink font-semibold hover:bg-brand-accent/90 transition-colors"
        >
          Browse merch
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center rounded-full px-6 py-3 border border-brand-primary/40 text-brand-ink font-medium hover:border-brand-primary/60 transition-colors"
        >
          About us
        </Link>
      </div>
      <nav className="!mt-8 flex flex-wrap gap-4 not-prose">
        <Link href="/blog" className="text-brand-primary font-medium hover:underline">
          Blog
        </Link>
        <Link href="/contact" className="text-brand-primary font-medium hover:underline">
          Partner with us — contact
        </Link>
      </nav>
    </MinistryPageShell>
  );
}
