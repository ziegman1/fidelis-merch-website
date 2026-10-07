/**
 * Syncs products from Printify API into the database.
 * Creates/updates Product, ProductVariant, ProductImage, ExternalProductMapping.
 * Run from seed or an admin/API trigger so Printify products appear in the unified catalog.
 */

import { prisma } from "@/lib/db";
import {
  getPrintifyShopId,
  fetchPrintifyProductList,
  fetchPrintifyProduct,
  type PrintifyApiProduct,
} from "@/lib/printify/api";

const PRINTIFY_PROVIDER_SLUG = "printify";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build options object from Printify product options + variant option value ids. */
function buildVariantOptions(
  product: PrintifyApiProduct,
  variant: { options?: number[]; title?: string }
): Record<string, string> {
  const opts: Record<string, string> = {};
  const optionList = product.options ?? [];
  const valueIds = variant.options ?? [];

  for (let i = 0; i < optionList.length; i++) {
    const opt = optionList[i];
    const valueId = valueIds[i];
    const value = opt.values?.find((v) => v.id === valueId);
    if (opt.name && value?.title) opts[opt.name] = value.title;
  }

  if (Object.keys(opts).length === 0 && variant.title) {
    opts["Variant"] = variant.title;
  }
  return opts;
}

export async function syncPrintifyToDb(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  error?: string;
}> {
  const shopId = getPrintifyShopId();
  if (!shopId) {
    return { success: false, created: 0, updated: 0, error: "PRINTIFY_SHOP_ID not set" };
  }

  let apiProducts: PrintifyApiProduct[];
  try {
    apiProducts = await fetchPrintifyProductList(shopId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, created: 0, updated: 0, error: message };
  }

  const provider = await prisma.provider.findUnique({
    where: { slug: PRINTIFY_PROVIDER_SLUG, isActive: true },
  });
  if (!provider) {
    return { success: false, created: 0, updated: 0, error: "Printify provider not found in DB" };
  }

  let created = 0;
  let updated = 0;

  for (const listProduct of apiProducts) {
    // Fetch full product to get is_default on images (list endpoint may omit it)
    const apiProduct =
      (await fetchPrintifyProduct(shopId, listProduct.id)) ?? listProduct;
    const baseSlug = slugify(apiProduct.title) || "product";
    const slug =
      baseSlug.length > 0
        ? `${baseSlug}-${apiProduct.id.slice(0, 8)}`
        : `printify-${apiProduct.id}`;

    const existingMapping = await prisma.externalProductMapping.findFirst({
      where: { externalProductId: apiProduct.id },
      select: { productId: true },
    });

    const existingProduct = existingMapping
      ? await prisma.product.findUnique({
          where: { id: existingMapping.productId },
          include: { variants: { include: { externalMappings: true } }, images: true },
        })
      : null;

    const isPublished = apiProduct.visible !== false;
    const productData = {
      title: apiProduct.title,
      slug: existingProduct?.slug ?? slug,
      description: apiProduct.description ?? null,
      fulfillmentType: "dropship" as const,
      providerId: provider.id,
      published: isPublished,
      status: isPublished ? "PUBLISHED" as const : "DRAFT" as const,
      publishedAt: isPublished ? new Date() : null,
      featured: false,
    };

    let productId: string;

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData,
      });
      productId = existingProduct.id;
      updated++;

      const existingVariantIds = new Set(
        existingProduct.variants.map((v) => v.id)
      );
      const apiVariantIds = new Set((apiProduct.variants ?? []).map((v) => String(v.id)));

      for (const ev of existingProduct.variants) {
        const mapping = ev.externalMappings[0];
        if (!mapping || !apiVariantIds.has(mapping.externalVariantId)) {
          await prisma.externalProductMapping.deleteMany({
            where: { productVariantId: ev.id },
          });
        }
      }
    } else {
      let uniqueSlug = slug;
      let exists = await prisma.product.findUnique({ where: { slug: uniqueSlug } });
      if (exists) uniqueSlug = `printify-${apiProduct.id}`;
      const createdProduct = await prisma.product.create({
        data: { ...productData, slug: uniqueSlug },
      });
      productId = createdProduct.id;
      created++;
    }

    const variants = apiProduct.variants ?? [];
    const existingVariants =
      existingProduct?.variants ?? [];
    const byExternalVariantId = new Map(
      existingVariants.flatMap((v) => {
        const m = v.externalMappings?.[0];
        return m ? [[m.externalVariantId, v] as const] : [];
      })
    );

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (v.is_enabled === false) continue;

      const options = buildVariantOptions(apiProduct, v);
      const externalVariantId = String(v.id);
      const existingV = byExternalVariantId.get(externalVariantId);
      const printifyAvailable = v.is_available === false ? false : v.is_available === true ? true : null;

      if (existingV) {
        await prisma.productVariant.update({
          where: { id: existingV.id },
          data: {
            name: v.title,
            sku: v.sku ?? undefined,
            priceCents: v.price,
            compareAtCents: null,
            options,
            sortOrder: i,
            printifyAvailable,
          },
        });
        await prisma.externalProductMapping.upsert({
          where: {
            productId_productVariantId: { productId, productVariantId: existingV.id },
          },
          create: {
            productId,
            productVariantId: existingV.id,
            externalProductId: apiProduct.id,
            externalVariantId,
          },
          update: {
            externalProductId: apiProduct.id,
            externalVariantId,
          },
        });
      } else {
        const newVariant = await prisma.productVariant.create({
          data: {
            productId,
            name: v.title,
            sku: v.sku ?? undefined,
            priceCents: v.price,
            compareAtCents: null,
            options,
            sortOrder: i,
            printifyAvailable,
          },
        });
        await prisma.externalProductMapping.create({
          data: {
            productId,
            productVariantId: newVariant.id,
            externalProductId: apiProduct.id,
            externalVariantId,
          },
        });
      }
    }

    // Preserve primaryImageId: before deleting, get the URL of the current primary image
    const existingImages = await prisma.productImage.findMany({
      where: { productId },
      select: { id: true, url: true },
    });
    const primaryImage = existingProduct?.primaryImageId
      ? existingImages.find((i) => i.id === existingProduct.primaryImageId)
      : null;
    const primaryImageUrlToPreserve = primaryImage?.url ?? null;

    await prisma.productImage.deleteMany({ where: { productId } });
    const rawImages = apiProduct.images ?? [];
    const images = [...rawImages].sort((a, b) => {
      const aDefault = a.is_default === true ? 0 : 1;
      const bDefault = b.is_default === true ? 0 : 1;
      return aDefault - bDefault;
    });
    const createdImageIds: { url: string; id: string }[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const variantIds =
        Array.isArray(img.variant_ids) && img.variant_ids.length > 0
          ? img.variant_ids
          : undefined;
      const created = await prisma.productImage.create({
        data: {
          productId,
          url: img.src,
          alt: apiProduct.title,
          sortOrder: i,
          ...(variantIds != null && { variantIds }),
        },
      });
      createdImageIds.push({ url: img.src, id: created.id });
    }

    // Restore primaryImageId by matching URL (preserves user's primary selection across syncs)
    if (primaryImageUrlToPreserve && createdImageIds.length > 0) {
      const match = createdImageIds.find(
        (c) => c.url === primaryImageUrlToPreserve || c.url === primaryImageUrlToPreserve?.trim()
      );
      await prisma.product.update({
        where: { id: productId },
        data: { primaryImageId: match?.id ?? null },
      });
    }
  }

  return { success: true, created, updated };
}
