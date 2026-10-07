-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable Product: add status, publishedAt, shortDescription, featuredImage
ALTER TABLE "Product" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Product" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "featuredImage" TEXT;

-- Backfill status from published
UPDATE "Product" SET "status" = 'PUBLISHED', "publishedAt" = COALESCE("updatedAt", NOW()) WHERE "published" = true;

-- AlterTable ProductVariant: add active, imageOverride
ALTER TABLE "ProductVariant" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductVariant" ADD COLUMN "imageOverride" TEXT;
