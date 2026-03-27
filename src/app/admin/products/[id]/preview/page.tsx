import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dbProductToUnified } from "@/lib/catalog/normalize-db";
import { buildProductColorMapping } from "@/data/product-image-mapping";
import { ProductGalleryAndForm } from "@/app/(storefront)/product/[slug]/product-gallery-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminProductPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  if (!session?.user || !isAdmin) {
    return (
      <div className="py-12 text-center">
        <p className="text-zinc-400">You must be signed in as admin to preview.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const { id } = await params;
  const dbProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: { sortOrder: "asc" },
        include: { inventory: true, externalMappings: true },
      },
    },
  });
  if (!dbProduct) notFound();

  const sourceType = dbProduct.providerId ? "printify" : "manual";
  const fulfillmentType = dbProduct.fulfillmentType === "dropship" ? "print_on_demand" : "in_house";
  const sourceProductId =
    dbProduct.variants[0]?.externalMappings?.[0]?.externalProductId ?? null;
  const product = dbProductToUnified(dbProduct, sourceType, fulfillmentType, sourceProductId);

  // Use product.images (from DB) so thumbnails match product editor order
  const orderedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const { colorToImageUrl, colorToImageIndex } = buildProductColorMapping(
    product,
    dbProduct.slug,
    orderedImages
  );

  const defaultVariant = product.variants[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-amber-600/50">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-medium">Preview (Draft)</span>
          <Button asChild variant="outline" size="sm" className="border-brand-primary/50">
            <Link href={`/admin/products/${id}/edit`}>Edit</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="sm" className="border-zinc-600">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col">
          <ProductGalleryAndForm
            product={product}
            orderedImages={orderedImages}
            colorToImageUrl={Object.keys(colorToImageUrl).length > 0 ? colorToImageUrl : undefined}
            colorToImageIndex={colorToImageIndex}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-amber-500 border border-amber-500/50 px-2 py-0.5 rounded">
                Preview
              </span>
              <Link
                href="/merch"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-brand-accent border border-zinc-600 hover:border-brand-primary/50 px-2 py-0.5 rounded transition-colors"
                aria-label="Back to shop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              {product.featured && (
                <span className="text-xs bg-brand-primary/20 text-brand-primary border border-brand-primary/50 px-2 py-0.5 rounded">
                  Featured
                </span>
              )}
              {product.fulfillmentType === "in_house" && product.availability === "out_of_stock" && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded">
                  Out of stock
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl text-brand-primary tracking-wide">{product.title}</h1>
            {product.description && (
              <p className="mt-2 text-zinc-400 text-sm whitespace-pre-wrap line-clamp-4">
                {product.description}
              </p>
            )}
            {product.fulfillmentType === "in_house" &&
              !product.markOutOfStock &&
              defaultVariant &&
              defaultVariant.quantityAvailable != null &&
              defaultVariant.quantityAvailable <= 5 &&
              defaultVariant.quantityAvailable > 0 && (
                <p className="mt-4 text-sm text-amber-400">
                  Only {defaultVariant.quantityAvailable} left.
                </p>
              )}
          </ProductGalleryAndForm>
        </div>
      </div>
    </div>
  );
}
