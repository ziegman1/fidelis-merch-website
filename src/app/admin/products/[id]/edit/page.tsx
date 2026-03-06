import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductForm } from "../../product-form";
import { Button } from "@/components/ui/button";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, provider: true, collections: true },
  });
  if (!product) notFound();

  const [providers, collections] = await Promise.all([
    prisma.provider.findMany({ where: { isActive: true } }),
    prisma.collection.findMany(),
  ]);

  async function updateProduct(formData: FormData) {
    "use server";
    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const fulfillmentType = (formData.get("fulfillmentType") as "dropship" | "self_fulfilled") || "self_fulfilled";
    const providerId = (formData.get("providerId") as string)?.trim() || null;
    const published = formData.get("published") === "on";

    if (!title) throw new Error("Title required");
    await prisma.product.update({
      where: { id },
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
        description,
        fulfillmentType,
        providerId: fulfillmentType === "dropship" ? providerId : null,
        published,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">Edit product</h1>
        <Button asChild variant="outline" size="sm" className="border-fidelis-gold/50">
          <Link href="/admin/products">Back to list</Link>
        </Button>
      </div>
      <ProductForm
        action={updateProduct}
        providers={providers}
        collections={collections}
        initial={{
          title: product.title,
          slug: product.slug,
          description: product.description,
          fulfillmentType: product.fulfillmentType,
          providerId: product.providerId,
          published: product.published,
        }}
      />
      <div className="rounded-md border border-zinc-700 p-4">
        <h3 className="font-medium text-cream mb-2">Variants ({product.variants.length})</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          {product.variants.map((v) => (
            <li key={v.id}>
              {v.name ?? v.sku ?? v.id} — ${(v.priceCents / 100).toFixed(2)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500 mt-2">Variant CRUD can be added in a follow-up.</p>
      </div>
    </div>
  );
}
