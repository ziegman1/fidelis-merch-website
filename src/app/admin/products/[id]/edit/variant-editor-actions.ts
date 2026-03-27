"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function addVariant(
  productId: string,
  name: string,
  priceCents: number,
  sku?: string,
  fulfillmentType?: string,
  imageOverride?: string,
  quantity?: number
) {
  const admin = await requireAdminSession();
  if (!admin) throw new Error("Unauthorized");

  const maxOrder = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  const sortOrder = (maxOrder[0]?.sortOrder ?? -1) + 1;

  const qty = quantity != null ? Math.max(0, quantity) : 0;
  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: name.trim() || "Default",
      priceCents: Math.max(0, priceCents),
      sku: sku?.trim() || null,
      sortOrder,
      imageOverride: imageOverride?.trim() || null,
      ...(fulfillmentType === "self_fulfilled" && {
        inventory: { create: { quantity: qty } },
      }),
    },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  if (product) {
    revalidatePath("/merch");
    revalidatePath("/");
    revalidatePath(`/product/${product.slug}`);
  }
  return { id: variant.id };
}

export async function updateVariant(
  variantId: string,
  data: { name?: string; priceCents?: number; sku?: string; imageOverride?: string }
) {
  const admin = await requireAdminSession();
  if (!admin) throw new Error("Unauthorized");

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.priceCents !== undefined && { priceCents: Math.max(0, data.priceCents) }),
      ...(data.sku !== undefined && { sku: data.sku || null }),
      ...(data.imageOverride !== undefined && { imageOverride: data.imageOverride?.trim() || null }),
    },
  });

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (variant) {
    revalidatePath(`/admin/products/${variant.productId}/edit`);
    revalidatePath("/merch");
    revalidatePath("/");
    revalidatePath(`/product/${variant.product.slug}`);
  }
}

export async function updateVariantInventory(variantId: string, quantity: number) {
  const admin = await requireAdminSession();
  if (!admin) throw new Error("Unauthorized");

  const qty = Math.max(0, quantity);
  await prisma.inventory.upsert({
    where: { variantId },
    create: { variantId, quantity: qty },
    update: { quantity: qty },
  });

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (variant) {
    revalidatePath(`/admin/products/${variant.productId}/edit`);
    revalidatePath("/merch");
    revalidatePath("/");
    revalidatePath(`/product/${variant.product.slug}`);
  }
}

export async function deleteVariant(variantId: string) {
  const admin = await requireAdminSession();
  if (!admin) throw new Error("Unauthorized");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  await prisma.productVariant.delete({ where: { id: variantId } });
  if (variant) {
    revalidatePath(`/admin/products/${variant.productId}/edit`);
    revalidatePath("/merch");
    revalidatePath("/");
    revalidatePath(`/product/${variant.product.slug}`);
  }
}
