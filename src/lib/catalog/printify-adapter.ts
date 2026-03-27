/**
 * Normalizes DB products linked to Printify into UnifiedProduct.
 * Server-side only.
 */

import { prisma } from "@/lib/db";
import type { UnifiedProduct } from "./types";
import { dbProductToUnified } from "./normalize-db";

const PRINTIFY_SLUG = "printify";

export async function getPrintifyProductsFromDb(): Promise<UnifiedProduct[]> {
  const printifyProvider = await prisma.provider.findUnique({
    where: { slug: PRINTIFY_SLUG, isActive: true },
  });
  if (!printifyProvider) return [];

  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      providerId: printifyProvider.id,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: { inventory: true, externalMappings: true },
      },
    },
  });

  return products.map((p) => {
    const sourceProductId =
      p.variants[0]?.externalMappings?.[0]?.externalProductId ?? null;
    return dbProductToUnified(p, "printify", "print_on_demand", sourceProductId);
  });
}
