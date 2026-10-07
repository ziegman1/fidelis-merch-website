-- Safe production schema fix for migration 20250308120000_add_product_status_and_extras
-- Idempotent: safe to run multiple times. Does not break if enum or columns already exist.

-- 1. Create ProductStatus enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END
$$;

-- 2. Add Product columns if they do not exist
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "featuredImage" TEXT;

-- 3. Backfill: set status and publishedAt for rows where published = true
UPDATE "Product"
SET "status" = 'PUBLISHED', "publishedAt" = COALESCE("updatedAt", NOW())
WHERE "published" = true;

-- 4. Add ProductVariant columns if they do not exist
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "imageOverride" TEXT;
