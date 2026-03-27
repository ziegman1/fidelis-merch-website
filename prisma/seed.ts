import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user (password: admin123) — change in production
  const adminPassword = await hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@fidelis.example" },
    create: {
      email: "admin@fidelis.example",
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    update: {},
  });

  // Create Printify provider
  const printify = await prisma.provider.upsert({
    where: { slug: "printify" },
    create: {
      type: "PRINTIFY",
      name: "Printify",
      slug: "printify",
      isActive: true,
    },
    update: {},
  });

  // Default collection
  const featured = await prisma.collection.upsert({
    where: { slug: "featured" },
    create: {
      name: "Featured",
      slug: "featured",
      description: "Featured merchandise",
      featured: true,
    },
    update: {},
  });

  const apparel = await prisma.collection.upsert({
    where: { slug: "apparel" },
    create: {
      name: "Apparel",
      slug: "apparel",
      description: "T-shirts, hoodies, and more",
    },
    update: {},
  });

  // Sample self-fulfilled product
  const product1 = await prisma.product.upsert({
    where: { slug: "fidelis-laser-tumbler" },
    create: {
      title: "Fidelis Laser-Engraved Tumbler",
      slug: "fidelis-laser-tumbler",
      description:
        "Premium stainless steel tumbler with laser-engraved Fidelis shield. Keeps drinks cold or hot.",
      fulfillmentType: "self_fulfilled",
      published: true,
      featured: true,
      tags: ["featured", "drinkware"],
      variants: {
        create: [
          {
            sku: "TUMBLER-20-BLK",
            name: "20oz Black",
            priceCents: 2999,
            options: { Size: "20oz", Color: "Black" },
            sortOrder: 0,
            inventory: { create: { quantity: 50 } },
          },
          {
            sku: "TUMBLER-20-GLD",
            name: "20oz Gold",
            priceCents: 2999,
            options: { Size: "20oz", Color: "Gold" },
            sortOrder: 1,
            inventory: { create: { quantity: 30 } },
          },
        ],
      },
      images: {
        create: [
          { url: "/placeholder-product.jpg", alt: "Fidelis Tumbler", sortOrder: 0 },
        ],
      },
    },
    update: { tags: ["featured", "drinkware"] },
    include: { variants: true },
  });

  await prisma.productCollection.createMany({
    data: [
      { productId: product1.id, collectionId: featured.id },
      { productId: product1.id, collectionId: apparel.id },
    ],
    skipDuplicates: true,
  });

  // Sample dropship product (no external mapping in seed; admin links in UI)
  const product2 = await prisma.product.upsert({
    where: { slug: "fidelis-crest-tee" },
    create: {
      title: "Fidelis Crest T-Shirt",
      slug: "fidelis-crest-tee",
      description: "Classic tee with the Fidelis shield and Celtic cross. Printify.",
      fulfillmentType: "dropship",
      providerId: printify.id,
      published: true,
      featured: true,
      tags: ["featured", "apparel"],
      variants: {
        create: [
          { sku: "TEE-S-BLK", name: "S Black", priceCents: 2499, options: { Size: "S", Color: "Black" }, sortOrder: 0 },
          { sku: "TEE-M-BLK", name: "M Black", priceCents: 2499, options: { Size: "M", Color: "Black" }, sortOrder: 1 },
          { sku: "TEE-L-BLK", name: "L Black", priceCents: 2499, options: { Size: "L", Color: "Black" }, sortOrder: 2 },
        ],
      },
      images: {
        create: [
          { url: "/placeholder-product.jpg", alt: "Fidelis Crest Tee", sortOrder: 0 },
        ],
      },
    },
    update: { tags: ["featured", "apparel"] },
    include: { variants: true },
  });

  await prisma.productCollection.createMany({
    data: [
      { productId: product2.id, collectionId: featured.id },
      { productId: product2.id, collectionId: apparel.id },
    ],
    skipDuplicates: true,
  });

  // Add Drinkware collection for backward compatibility
  await prisma.collection.upsert({
    where: { slug: "drinkware" },
    create: {
      name: "Drinkware",
      slug: "drinkware",
      description: "Tumblers, mugs, and more",
    },
    update: {},
  });

  // Default shipping rates
  await prisma.shippingRate.upsert({
    where: { zoneType: "domestic_us" },
    create: { zoneType: "domestic_us", name: "Standard (US)", priceCents: 599, sortOrder: 0 },
    update: {},
  });
  await prisma.shippingRate.upsert({
    where: { zoneType: "international" },
    create: { zoneType: "international", name: "International", priceCents: 1499, sortOrder: 1 },
    update: {},
  });

  console.log("Seed complete:", {
    printify: printify.id,
    collections: [featured.slug, apparel.slug],
    products: [product1.slug, product2.slug],
  });

  // Sync manual products from src/data/manual-products.ts into DB
  const { syncManualProductsToDb } = await import("../src/lib/catalog/sync-manual-products");
  const syncResult = await syncManualProductsToDb();
  console.log("Manual products sync:", syncResult);

  // Sync Printify products from API into DB (if PRINTIFY_API_TOKEN/PRINTIFY_API_KEY and PRINTIFY_SHOP_ID are set)
  const { syncPrintifyToDb } = await import("../src/lib/catalog/sync-printify-to-db");
  const printifyResult = await syncPrintifyToDb();
  console.log("Printify sync:", printifyResult);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
