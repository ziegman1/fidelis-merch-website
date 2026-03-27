import type { ReactNode } from "react";

export function MinistryPageShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl text-brand-primary tracking-wide">
          {title}
        </h1>
        {lede ? (
          <p className="mt-4 text-lg text-brand-ink/85 leading-relaxed max-w-2xl">{lede}</p>
        ) : null}
      </header>
      <div className="prose prose-slate max-w-none text-brand-ink/90 space-y-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-brand-ink [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:tracking-tight [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-brand-primary [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
