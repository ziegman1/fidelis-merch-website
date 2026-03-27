/**
 * Server-side Printify API client.
 * Uses PRINTIFY_API_TOKEN (or PRINTIFY_API_KEY) and PRINTIFY_SHOP_ID.
 * Never expose these to the browser.
 */

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

export function getPrintifyShopId(): string | null {
  const id = process.env.PRINTIFY_SHOP_ID;
  return id?.trim() ? id : null;
}

function getAuthHeader(): string | null {
  const token = getPrintifyToken();
  if (!token) return null;
  return `Bearer ${token}`;
}

/** Raw product from Printify API (list item or single product). */
export interface PrintifyApiProduct {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  options?: Array<{ name: string; type?: string; values: Array<{ id: number; title: string }> }>;
  variants?: Array<{
    id: number;
    sku?: string;
    cost?: number;
    price: number;
    title: string;
    is_available?: boolean;
    is_enabled?: boolean;
    options?: number[];
  }>;
  images?: Array<{
    src: string;
    variant_ids?: number[];
    position?: string;
    /** When true, this is the primary mockup shown first. */
    is_default?: boolean;
  }>;
  visible?: boolean;
}

interface PrintifyListResponse {
  current_page: number;
  data: PrintifyApiProduct[];
  last_page: number;
  per_page: number;
  total: number;
  next_page_url?: string | null;
}

/**
 * Fetch all products from a Printify shop (paginated).
 */
export async function fetchPrintifyProductList(shopId: string): Promise<PrintifyApiProduct[]> {
  const auth = getAuthHeader();
  if (!auth) throw new Error("Printify API token not configured");

  const all: PrintifyApiProduct[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${PRINTIFY_API_BASE}/shops/${encodeURIComponent(shopId)}/products.json?limit=50&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "User-Agent": "ZiegsMissionMerch/1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Printify API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as PrintifyListResponse;
    const data = json.data ?? [];
    all.push(...data);

    if (data.length === 0 || page >= (json.last_page ?? 1)) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return all;
}

/**
 * Fetch a single product by ID from a Printify shop.
 */
export async function fetchPrintifyProduct(
  shopId: string,
  productId: string
): Promise<PrintifyApiProduct | null> {
  const auth = getAuthHeader();
  if (!auth) throw new Error("Printify API token not configured");

  const url = `${PRINTIFY_API_BASE}/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      "User-Agent": "ZiegsMissionMerch/1.0",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Printify API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as PrintifyApiProduct;
}
