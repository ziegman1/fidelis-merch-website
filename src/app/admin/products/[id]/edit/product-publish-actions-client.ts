"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function publishProduct(formData: FormData) {
  const admin = await requireAdminSession();
  if (!admin) return;
  const productId = formData.get("productId") as string;
  const slug = formData.get("slug") as string;
  if (!productId || !slug) return;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, variants: { where: { active: true } } },
  });
  if (!product) return;
  if (product.images.length === 0) throw new Error("Add at least one image before publishing");
  if (product.variants.length === 0) throw new Error("Add at least one active variant before publishing");

  await prisma.product.update({
    where: { id: productId },
    data: { status: "PUBLISHED", published: true, publishedAt: new Date() },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/merch");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
}

export async function unpublishProduct(formData: FormData) {
  const admin = await requireAdminSession();
  if (!admin) return;
  const productId = formData.get("productId") as string;
  const slug = formData.get("slug") as string;
  if (!productId || !slug) return;
  await prisma.product.update({
    where: { id: productId },
    data: { status: "DRAFT", published: false },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/merch");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
}

export async function archiveProduct(formData: FormData) {
  const admin = await requireAdminSession();
  if (!admin) return;
  const productId = formData.get("productId") as string;
  const slug = formData.get("slug") as string;
  if (!productId || !slug) return;
  await prisma.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED", published: false },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/merch");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
}

export async function unarchiveProduct(formData: FormData) {
  const admin = await requireAdminSession();
  if (!admin) return;
  const productId = formData.get("productId") as string;
  if (!productId) return;
  await prisma.product.update({
    where: { id: productId },
    data: { status: "DRAFT", published: false },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
}
