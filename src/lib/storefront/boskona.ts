/**
 * Bos' Kọ́nà Storefront Adapter
 * ---------------------------------------------------------------
 * This is the ONLY place the passport app talks to the Bos' Kọ́nà
 * store. Everything else imports from here.
 *
 * Today: returns mock data so the UI can render.
 * Later: swap the bodies of `fetchProduct` / `fetchOrder` with real
 * HTTP calls (REST, GraphQL, webhook cache, whatever Bos' Kọ́nà
 * exposes). No other file needs to change.
 *
 * Linking model:
 *   product_id  → permanent identity anchor (assets.store_product_id)
 *   order_id    → acquisition proof (ownership_records.store_order_id)
 */

export type StorefrontProduct = {
  id: string;
  name: string;
  drop?: string;
  price?: { amount: number; currency: string };
  url?: string;
};

export type StorefrontOrder = {
  id: string;
  productId: string;
  ownerRef?: string;
  purchaseDate: string; // ISO
};

// ─── MOCK DATA (remove when wiring real API) ───────────────────────
const MOCK_PRODUCTS: Record<string, StorefrontProduct> = {
  "AF1-001": {
    id: "AF1-001",
    name: "Air Formula F1",
    drop: "Drop 01 · Heirloom",
    price: { amount: 850, currency: "USD" },
    url: "https://boskona.example.com/products/air-formula-f1",
  },
};

const MOCK_ORDERS: Record<string, StorefrontOrder> = {
  ORD_9837421: {
    id: "ORD_9837421",
    productId: "AF1-001",
    ownerRef: "anonymous-buyer",
    purchaseDate: "2026-01-15T10:30:00Z",
  },
};

// ─── PUBLIC API ────────────────────────────────────────────────────

/** TODO: replace mock with real Bos' Kọ́nà product API call. */
export async function fetchProduct(
  productId: string,
): Promise<StorefrontProduct | null> {
  return MOCK_PRODUCTS[productId] ?? null;
}

/** TODO: replace mock with real Bos' Kọ́nà order API call. */
export async function fetchOrder(
  orderId: string,
): Promise<StorefrontOrder | null> {
  return MOCK_ORDERS[orderId] ?? null;
}

/** Builds the public storefront URL for a product. Safe for UI links. */
export function productUrl(productId: string): string {
  // TODO: use real store domain
  return `https://boskona.example.com/products/${productId}`;
}
