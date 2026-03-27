import type { Metadata } from "next";
import Link from "next/link";
import { MinistryPageShell } from "@/components/ministry-page-shell";
import { getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "Blog",
    description: `Updates, stories, and resources from ${copy.site.name}.`,
  };
}

export default async function BlogPage() {
  const copy = await getSiteCopy();
  const { title, lede, intro, topicsHeading, topics, emptyNote } = copy.blog;

  return (
    <MinistryPageShell title={title} lede={lede}>
      <p>{intro}</p>
      <section>
        <h2>{topicsHeading}</h2>
        <ul>
          {topics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <div className="not-prose mt-10 rounded-xl border border-brand-primary/20 bg-white/60 px-5 py-6 sm:px-8">
        <p className="text-brand-ink/80 text-sm sm:text-base leading-relaxed">{emptyNote}</p>
        <p className="mt-4">
          <Link href="/contact" className="text-brand-primary font-semibold hover:underline">
            Contact us
          </Link>
          <span className="text-brand-ink/60"> · </span>
          <Link href="/mission" className="text-brand-primary font-semibold hover:underline">
            Read our mission
          </Link>
        </p>
      </div>
      <nav className="!mt-10 pt-8 border-t border-brand-primary/25 flex flex-wrap gap-4 not-prose">
        <Link href="/" className="text-brand-primary font-medium hover:underline">
          ← Home
        </Link>
        <Link href="/about" className="text-brand-primary font-medium hover:underline">
          About
        </Link>
        <Link href="/merch" className="text-brand-primary font-medium hover:underline">
          Merch
        </Link>
      </nav>
    </MinistryPageShell>
  );
}
