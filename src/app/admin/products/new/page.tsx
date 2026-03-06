import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const [providers, collections] = await Promise.all([
    prisma.provider.findMany({ where: { isActive: true } }),
    prisma.collection.findMany(),
  ]);

  async function createProduct(formData: FormData) {
    "use server";
    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim() || title?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const description = (formData.get("description") as string)?.trim() || null;
    const fulfillmentType = (formData.get("fulfillmentType") as "dropship" | "self_fulfilled") || "self_fulfilled";
    const providerId = (formData.get("providerId") as string)?.trim() || null;
    const published = formData.get("published") === "on";

    if (!title) throw new Error("Title required");
    const finalSlug = slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await prisma.product.create({
      data: {
        title,
        slug: finalSlug,
        description,
        fulfillmentType,
        providerId: fulfillmentType === "dropship" ? providerId : null,
        published,
        variants: {
          create: {
            name: "Default",
            sku: `SKU-${Date.now()}`,
            priceCents: 0,
            sortOrder: 0,
            ...(fulfillmentType === "self_fulfilled" && {
              inventory: { create: { quantity: 0 } },
            }),
          },
        },
      },
    });
    redirect("/admin/products");
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">New product</h1>
      <ProductForm
        action={createProduct}
        providers={providers}
        collections={collections}
      />
    </div>
  );
}
