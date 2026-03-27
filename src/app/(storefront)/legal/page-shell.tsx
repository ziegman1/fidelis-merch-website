import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide mb-8">
        {title}
      </h1>
      <div className="prose prose-slate max-w-none text-brand-ink/90 space-y-6 [&_h2]:text-xl [&_h2]:text-brand-ink [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:text-brand-ink [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-brand-primary [&_a]:hover:underline">
        {children}
      </div>
    </article>
  );
}
