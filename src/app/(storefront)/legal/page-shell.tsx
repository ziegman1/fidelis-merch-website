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
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide mb-8">
        {title}
      </h1>
      <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 space-y-6 [&_h2]:text-xl [&_h2]:text-cream [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:text-cream [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-fidelis-gold [&_a]:hover:underline">
        {children}
      </div>
    </article>
  );
}
