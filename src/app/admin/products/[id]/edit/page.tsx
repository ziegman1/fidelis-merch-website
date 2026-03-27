import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";
import { ProductForm } from "../../product-form";
import { ProductImagesCard } from "./product-images-card";
import { ProductTagsCard } from "./product-tags-card";
import { ColorMappingCard } from "./color-mapping-card";
import { ProductPublishActions } from "./product-publish-actions";
import { VariantEditorCard } from "./variant-editor-card";
import { OutOfStockToggle } from "./out-of-stock-toggle";
import { PausedToggle } from "./paused-toggle";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { sortOrder: "asc" }, include: { inventory: true } },
      provider: true,
      collections: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const [providers, collections] = await Promise.all([
    prisma.provider.findMany({ where: { isActive: true } }),
    prisma.collection.findMany(),
  ]);

  async function updateProduct(formData: FormData) {
    "use server";
    const admin = await requireAdminSession();
    if (!admin) throw new Error("Unauthorized");

    const title = (formData.get("title") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const fulfillmentType = (formData.get("fulfillmentType") as "dropship" | "self_fulfilled") || "self_fulfilled";
    const providerId = (formData.get("providerId") as string)?.trim() || null;
    const statusInput = formData.get("status") as string | null;
    const status = statusInput === "PUBLISHED" ? "PUBLISHED" : statusInput === "ARCHIVED" ? "ARCHIVED" : "DRAFT";
    const published = status === "PUBLISHED";
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || null;
    const featuredImage = (formData.get("featuredImage") as string)?.trim() || null;

    if (!title) throw new Error("Title required");

    const finalSlug = slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existingBySlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (existingBySlug && existingBySlug.id !== id) throw new Error(`Slug "${finalSlug}" already in use`);

    await prisma.product.update({
      where: { id },
      data: {
        title,
        slug: finalSlug,
        description,
        shortDescription,
        featuredImage: featuredImage || null,
        fulfillmentType,
        providerId: fulfillmentType === "dropship" ? providerId : null,
        published,
        status,
        publishedAt: status === "PUBLISHED" ? (product!.publishedAt ?? new Date()) : product!.publishedAt,
      },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath(`/admin/products`);
    if (status === "PUBLISHED" || product!.status === "PUBLISHED") {
      revalidatePath(`/merch`);
      revalidatePath(`/`);
      revalidatePath(`/product/${finalSlug}`);
    }
  }

  async function addProductImage(productId: string, url: string, alt?: string) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    const maxOrder = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    await prisma.productImage.create({
      data: {
        productId,
        url,
        alt: alt ?? null,
        sortOrder: (maxOrder[0]?.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath(`/admin/products/${id}/edit`);
  }

  async function deleteProductImage(imageId: string) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    const img = await prisma.productImage.findUnique({ where: { id: imageId }, select: { productId: true } });
    if (!img) return;
    await prisma.productImage.delete({ where: { id: imageId } });
    // Clear primaryImageId if the deleted image was primary
    await prisma.product.updateMany({
      where: { id: img.productId, primaryImageId: imageId },
      data: { primaryImageId: null },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function moveImage(productId: string, imageId: string, direction: "left" | "right") {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    });
    const idx = images.findIndex((i) => i.id === imageId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;
    const [a, b] = [images[idx], images[swapIdx]];
    await prisma.$transaction([
      prisma.productImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      prisma.productImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function saveColorOrder(productId: string, colorOrder: string[]) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    await prisma.product.update({
      where: { id: productId },
      data: { colorOrder },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function setPrimaryImage(productId: string, imageId: string) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    await prisma.product.update({
      where: { id: productId },
      data: { primaryImageId: imageId },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function saveProductTags(productId: string, tags: string[]) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    await prisma.product.update({
      where: { id: productId },
      data: { tags },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function setMarkOutOfStock(productId: string, markOutOfStock: boolean) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    await prisma.product.update({
      where: { id: productId },
      data: { markOutOfStock },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  async function setAvailability(productId: string, paused: boolean, comingSoon: boolean) {
    "use server";
    if (!(await requireAdminSession())) throw new Error("Unauthorized");
    await prisma.product.update({
      where: { id: productId },
      data: { paused, comingSoon },
    });
    revalidatePath(`/admin/products/${id}/edit`);
    if (product!.status === "PUBLISHED") {
      revalidatePath("/merch");
      revalidatePath("/");
      revalidatePath(`/product/${product!.slug}`);
    }
  }

  const productTags = Array.isArray(product.tags)
    ? (product.tags as string[]).filter((t): t is string => typeof t === "string")
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-brand-primary tracking-wide">Edit product</h1>
        <Button asChild variant="outline" size="sm" className="border-brand-primary/50">
          <Link href="/admin/products">Back to list</Link>
        </Button>
      </div>
      <ProductPublishActions product={product} />
      <ProductForm
        key={product.updatedAt.toISOString()}
        action={updateProduct}
        providers={providers}
        collections={collections}
        initial={{
          title: product.title,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription,
          featuredImage: product.featuredImage,
          fulfillmentType: product.fulfillmentType,
          providerId: product.providerId,
          status: product.status,
          published: product.published,
        }}
      />
      <ProductImagesCard
        productId={product.id}
        images={product.images}
        primaryImageId={product.primaryImageId}
        onAddImage={addProductImage}
        onDeleteImage={deleteProductImage}
        onMoveImage={moveImage}
        onSetPrimaryImage={setPrimaryImage}
      />
      <ProductTagsCard
        productId={product.id}
        initialTags={productTags}
        onSave={saveProductTags}
      />
      <ColorMappingCard
        productId={product.id}
        productSlug={product.slug}
        images={product.images}
        variants={product.variants}
        initialColorOrder={
          Array.isArray(product.colorOrder) ? (product.colorOrder as string[]) : null
        }
        onSaveColorOrder={saveColorOrder}
      />
      {product.fulfillmentType === "self_fulfilled" && (
        <OutOfStockToggle
          productId={product.id}
          initialMarkOutOfStock={product.markOutOfStock}
          onToggle={setMarkOutOfStock}
        />
      )}
      <PausedToggle
        productId={product.id}
        initialPaused={product.paused}
        initialComingSoon={product.comingSoon}
        onToggle={setAvailability}
      />
      {product.fulfillmentType === "self_fulfilled" && product.variants.length > 0 && (
        <p className="text-sm text-zinc-500">
          Variant Image URLs above are used as fallback when no product images are set. Product images take precedence on the store.
        </p>
      )}
      <VariantEditorCard productId={product.id} variants={product.variants} fulfillmentType={product.fulfillmentType} />
    </div>
  );
}
