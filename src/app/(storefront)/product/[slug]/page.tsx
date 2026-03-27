import { notFound } from "next/navigation";
import { getUnifiedProductBySlug } from "@/lib/catalog";
import { buildProductColorMapping, getImageMapping } from "@/data/product-image-mapping";
import { ProductGalleryAndForm } from "./product-gallery-form";
import { BackButton } from "./back-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getUnifiedProductBySlug(slug);
  if (!product) notFound();

  // Use product.images (from DB) so store thumbnails match product editor order
  const orderedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const { colorToImageUrl, colorToImageIndex } = buildProductColorMapping(
    product,
    slug,
    orderedImages
  );

  // Use mapping colorOrder for variant sort when product has none (e.g. Printify products)
  const mapping = getImageMapping(slug);
  const productWithColorOrder = {
    ...product,
    colorOrder: product.colorOrder?.length
      ? product.colorOrder
      : mapping?.colorOrder ?? product.colorOrder,
  };

  const defaultVariant = product.variants[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-5rem)] min-h-0">
      <ProductGalleryAndForm
        product={productWithColorOrder}
        orderedImages={orderedImages}
        colorToImageUrl={Object.keys(colorToImageUrl).length > 0 ? colorToImageUrl : undefined}
        colorToImageIndex={
          colorToImageIndex && Object.keys(colorToImageIndex).length > 0 ? colorToImageIndex : undefined
        }
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <BackButton />
          {product.featured && (
            <span className="text-xs bg-brand-primary/20 text-brand-primary border border-brand-primary/50 px-2 py-0.5 rounded">
              Featured
            </span>
          )}
          {(product.paused || product.comingSoon || (product.fulfillmentType === "in_house" && product.availability === "out_of_stock")) && (
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded">
              {product.comingSoon ? "Coming Soon" : product.paused ? "Temporarily unavailable" : "Out of stock"}
            </span>
          )}
        </div>
        <h1 className="font-serif text-3xl text-brand-primary tracking-wide">
          {product.title}
        </h1>
        {product.description && (
          <div className="mt-2 max-h-32 overflow-y-auto rounded border border-brand-primary/25 bg-white/80 px-3 py-2">
            <p className="text-brand-ink/80 text-sm whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}
        {product.fulfillmentType === "in_house" &&
          !product.paused &&
          !product.comingSoon &&
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
  );
}
