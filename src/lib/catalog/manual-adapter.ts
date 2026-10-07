/**
 * Normalizes DB products that are in-house (self_fulfilled) into UnifiedProduct.
 * Manual products defined in src/data/manual-products.ts are synced to DB via syncManualProductsToDb();
 * this adapter only reads from the database.
 */

import { prisma } from "@/lib/db";
import type { UnifiedProduct } from "./types";
import { dbProductToUnified } from "./normalize-db";

export async function getManualProductsFromDb(): Promise<UnifiedProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      fulfillmentType: "self_fulfilled",
      providerId: null,
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

  return products.map((p) =>
    dbProductToUnified(p, "manual", "in_house", null)
  );
}
