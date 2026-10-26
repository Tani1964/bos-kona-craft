/**
 * Bos' Kọ́nà Storefront Adapter
 * ---------------------------------------------------------------
 * This is the ONLY place the passport app talks to the Bos' Kọ́nà
 * store. Everything else imports from here.
 *
 * Connected to the live store (shelf-style-sole-shop): product links
 * and product details come from it. Passports themselves are created by
 * the store's signed webhook when an order is delivered.
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

// ─── CONFIG ────────────────────────────────────────────────────────
// The live Bos' Kọ́nà store. Products are public in its catalogue (read
// with its publishable key); orders are not, so order details arrive with
// the signed storefront webhook instead (see api/public/storefront-webhook).
const STORE_URL =
  import.meta.env.VITE_STOREFRONT_URL ?? "https://shelf-style-sole-shop.vercel.app";
const STORE_API_URL =
  import.meta.env.VITE_STOREFRONT_API_URL ?? "https://suqxagagdklzluhsljrv.supabase.co";
const STORE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STOREFRONT_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cXhhZ2FnZGtsemx1aHNsanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODcwMzQsImV4cCI6MjA2MzI2MzAzNH0.HKYHdnBNpowdtU2hZ1Ts4n-8MpaRLPPMDOqSMbzVfMY";

// ─── PUBLIC API ────────────────────────────────────────────────────

/** Product details from the live store's public catalogue. */
export async function fetchProduct(
  productId: string,
): Promise<StorefrontProduct | null> {
  try {
    const response = await fetch(
      `${STORE_API_URL}/rest/v1/shoes?select=id,name&id=eq.${encodeURIComponent(productId)}`,
      { headers: { apikey: STORE_PUBLISHABLE_KEY, Authorization: `Bearer ${STORE_PUBLISHABLE_KEY}` } },
    );
    if (!response.ok) return null;
    const [shoe] = (await response.json()) as Array<{ id: string; name: string }>;
    if (!shoe) return null;
    // Price is left out: the store prices each shoe by its chosen materials.
    return {
      id: shoe.id,
      name: shoe.name,
      url: productUrl(shoe.id),
    };
  } catch {
    return null;
  }
}

/**
 * Orders are private in the store. Everything the passport needs from an
 * order arrives in the signed storefront webhook, so there is nothing to
 * look up here.
 */
export async function fetchOrder(
  _orderId: string,
): Promise<StorefrontOrder | null> {
  return null;
}

/** The product's page in the live store. Safe for UI links. */
export function productUrl(productId: string): string {
  return `${STORE_URL}/shop/${encodeURIComponent(productId)}`;
}
