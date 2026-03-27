import { redirect } from "next/navigation";

/** Legacy URL — store lives at /merch */
export default async function ShopRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; featured?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.category) params.set("category", sp.category);
  if (sp.q) params.set("q", sp.q);
  if (sp.featured) params.set("featured", sp.featured);
  const qs = params.toString();
  redirect(`/merch${qs ? `?${qs}` : ""}`);
}
