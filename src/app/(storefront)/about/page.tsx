import type { Metadata } from "next";
import Link from "next/link";
import { MinistryPageShell } from "@/components/ministry-page-shell";
import { getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "About",
    description: `Learn about ${copy.site.name} — who we are and why this ministry exists.`,
  };
}

export default async function AboutPage() {
  const copy = await getSiteCopy();
  const { title, lede, sections } = copy.about;

  return (
    <MinistryPageShell title={title} lede={lede}>
      {sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </section>
      ))}
      <nav className="!mt-12 pt-8 border-t border-brand-primary/25 flex flex-wrap gap-4 not-prose">
        <Link href="/mission" className="text-brand-primary font-medium hover:underline">
          Our mission →
        </Link>
        <Link href="/blog" className="text-brand-primary font-medium hover:underline">
          Blog
        </Link>
        <Link href="/contact" className="text-brand-primary font-medium hover:underline">
          Contact
        </Link>
      </nav>
    </MinistryPageShell>
  );
}
