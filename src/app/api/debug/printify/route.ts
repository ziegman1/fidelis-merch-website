/**
 * Temporary debug route to verify Printify config and API.
 * GET /api/debug/printify
 * Returns: token present, shop id present, API success, product count (no secrets).
 */

import { NextResponse } from "next/server";
import { getPrintifyToken, getPrintifyShopId, fetchPrintifyProductList } from "@/lib/printify/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const hasToken = !!getPrintifyToken();
  const hasShopId = !!getPrintifyShopId();
  const shopId = getPrintifyShopId();

  let apiSuccess = false;
  let productCount: number | null = null;
  let errorMessage: string | null = null;

  if (hasToken && hasShopId && shopId) {
    try {
      const products = await fetchPrintifyProductList(shopId);
      apiSuccess = true;
      productCount = products.length;
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    tokenPresent: hasToken,
    shopIdPresent: hasShopId,
    apiSuccess,
    productCount,
    error: errorMessage,
  });
}
