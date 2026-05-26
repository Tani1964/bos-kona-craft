/**
 * Bos' Kọ́nà Storefront Webhook
 * ---------------------------------------------------------------
 * Called by the main store on purchase events. Auto-creates a
 * craft passport (asset + telemetry + first ownership record) so
 * the admin never has to paste an ID by hand.
 *
 * Expected event payloads (extend as Bos' Kọ́nà finalizes):
 *   { type: "order.created",
 *     order:   { id, purchased_at, owner_ref? },
 *     product: { id, name, sku? },
 *     unit:    { serial, lot? } }
 *
 * Security:
 *   - HMAC-SHA256 signature in `x-boskona-signature` header,
 *     computed over the raw request body using STOREFRONT_WEBHOOK_SECRET.
 *   - Add the secret via Lovable Cloud secrets before going live.
 *     Until then, the endpoint refuses every request (fail-closed).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PayloadSchema = z.object({
  type: z.literal("order.created"),
  order: z.object({
    id: z.string().min(1).max(128),
    purchased_at: z.string().datetime().optional(),
    owner_ref: z.string().max(255).optional(),
    // E.164 phone (+ then 8–15 digits). This is the auth anchor — buyer
    // verifies this number via OTP at /claim to unlock their passport.
    owner_phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  }),
  product: z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(255),
  }),
  unit: z.object({
    serial: z.string().min(1).max(64),
    lot: z.string().max(64).optional(),
  }),
});

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.STOREFRONT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/storefront-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("x-boskona-signature");

        if (!verifySignature(raw, sig)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed;
        try {
          parsed = PayloadSchema.parse(JSON.parse(raw));
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "Invalid payload", details: String(err) }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { order, product, unit } = parsed;

        // 1. Upsert asset (one per physical serial)
        const { data: asset, error: assetErr } = await supabaseAdmin
          .from("assets")
          .upsert(
            {
              serial: unit.serial,
              model_name: product.name,
              lot: unit.lot ?? null,
              store_product_id: product.id,
              status: "New",
            },
            { onConflict: "serial" },
          )
          .select("id")
          .single();

        if (assetErr || !asset) {
          return new Response(
            JSON.stringify({ error: "Asset upsert failed", details: assetErr?.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        // 2. Seed telemetry row (idempotent)
        await supabaseAdmin
          .from("asset_telemetry")
          .upsert({ asset_id: asset.id }, { onConflict: "asset_id" });

        // 3. Record the first ownership event (idempotent on store_order_id)
        const { error: ownerErr } = await supabaseAdmin
          .from("ownership_records")
          .upsert(
            {
              asset_id: asset.id,
              store_order_id: order.id,
              owner_ref: order.owner_ref ?? null,
              event_type: "purchase",
              acquired_at: order.purchased_at ?? new Date().toISOString(),
            },
            { onConflict: "store_order_id" },
          );

        if (ownerErr) {
          return new Response(
            JSON.stringify({ error: "Ownership record failed", details: ownerErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ ok: true, asset_id: asset.id, serial: unit.serial }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
