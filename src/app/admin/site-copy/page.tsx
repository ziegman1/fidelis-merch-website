import { getSiteCopy } from "@/lib/site-copy";
import { SiteCopyEditor } from "./site-copy-editor";

export default async function AdminSiteCopyPage() {
  const copy = await getSiteCopy();

  return (
    <div>
      <h1 className="font-serif text-2xl text-brand-primary tracking-wide mb-2">Site copy</h1>
      <p className="text-sm text-zinc-400 mb-8 max-w-2xl leading-relaxed">
        Edit public-facing text across the ministry site. Saving writes to the database and
        refreshes cached pages. If the database is unavailable, the storefront falls back to code
        defaults.
      </p>
      <SiteCopyEditor initialCopy={copy} />
    </div>
  );
}
