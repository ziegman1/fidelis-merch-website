/**
 * Syncs products from src/data/manual-products.ts into the database.
 * Run from seed or admin action so file-based manual products become sellable.
 */

import { prisma } from "@/lib/db";
import { manualProducts } from "@/data/manual-products";
import { ALL_TAGS } from "@/data/product-tags";

function buildTagsFromDef(def: (typeof manualProducts)[0]): string[] {
  const tags = new Set<string>();
  if (def.featured) tags.add("featured");
  const cat = (def.category ?? "").toLowerCase();
  if (cat === "drinkware") tags.add("drinkware");
  if (cat === "apparel") tags.add("apparel");
  for (const t of def.tags ?? []) {
    if (typeof t === "string" && (ALL_TAGS as readonly string[]).includes(t))
      tags.add(t);
  }
  return Array.from(tags);
}

export async function syncManualProductsToDb(): Promise<{
  created: number;
  updated: number;
}> {
  let created = 0;
  let updated = 0;

  for (const def of manualProducts) {
    const existing = await prisma.product.findUnique({
      where: { slug: def.slug },
      include: { variants: true, images: true },
    });

    const tags = buildTagsFromDef(def);
    const productData = {
      title: def.title,
      slug: def.slug,
      description: def.description,
      fulfillmentType: "self_fulfilled" as const,
      providerId: null,
      published: true,
      featured: def.featured ?? false,
      tags,
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: productData,
      });
      await syncVariantsAndImages(existing.id, def);
      updated++;
    } else {
      const product = await prisma.product.create({
        data: {
          ...productData,
          variants: {
            create: def.variants.map((v, i) => ({
              name: v.name,
              sku: v.sku ?? `MANUAL-${def.slug}-${i + 1}`,
              priceCents: v.priceCents,
              compareAtCents: v.compareAtCents ?? null,
              options: v.options ?? {},
              sortOrder: i,
              inventory:
                v.quantity != null
                  ? { create: { quantity: v.quantity } }
                  : undefined,
            })),
          },
        },
        include: { variants: true },
      });
      for (let i = 0; i < def.images.length; i++) {
        const img = def.images[i];
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
            alt: img.alt ?? null,
            sortOrder: img.sortOrder ?? i,
          },
        });
      }
      created++;
    }
  }

  return { created, updated };
}

async function syncVariantsAndImages(
  productId: string,
  def: (typeof manualProducts)[0]
): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true },
  });
  if (!existing) return;

  for (let i = 0; i < def.variants.length; i++) {
    const v = def.variants[i];
    const existingV = existing.variants[i];
    if (existingV) {
      await prisma.productVariant.update({
        where: { id: existingV.id },
        data: {
          name: v.name,
          sku: v.sku ?? existingV.sku,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          options: v.options ?? {},
        },
      });
      if (v.quantity != null) {
        await prisma.inventory.upsert({
          where: { variantId: existingV.id },
          create: { variantId: existingV.id, quantity: v.quantity },
          update: { quantity: v.quantity },
        });
      }
    } else {
      const newV = await prisma.productVariant.create({
        data: {
          productId,
          name: v.name,
          sku: v.sku ?? `MANUAL-${def.slug}-${i + 1}`,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          options: v.options ?? {},
          sortOrder: i,
          ...(v.quantity != null
            ? { inventory: { create: { quantity: v.quantity } } }
            : {}),
        },
      });
    }
  }

  await prisma.productImage.deleteMany({ where: { productId } });
  for (let i = 0; i < def.images.length; i++) {
    const img = def.images[i];
    await prisma.productImage.create({
      data: {
        productId,
        url: img.url,
        alt: img.alt ?? null,
        sortOrder: img.sortOrder ?? i,
      },
    });
  }
}
