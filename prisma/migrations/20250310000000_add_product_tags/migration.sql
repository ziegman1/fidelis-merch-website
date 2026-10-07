-- AlterTable Product: add tags for featured/category selection
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" JSONB DEFAULT '[]';
