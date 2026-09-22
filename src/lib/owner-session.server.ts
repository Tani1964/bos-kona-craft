// Owner session helpers (phone-matched, no OTP).
// Server-only. Shared by owner.functions.ts and wear.functions.ts so the
// cookie name / secret / ownership rule live in exactly one place.
import { useSession } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OwnerSession = { phone?: string };

export function sessionConfig() {
  const password =
    process.env.OWNER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fallback-dev-only-secret-change-me-please-12345678";
  return {
    password: password.padEnd(32, "0").slice(0, 64),
    name: "bk_owner",
    maxAge: 60 * 60 * 24 * 90,
    cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
  };
}

export async function getOwnerSession() {
  return useSession<OwnerSession>(sessionConfig());
}

export async function getOwnerPhone(): Promise<string | null> {
  const session = await getOwnerSession();
  return session.data.phone ?? null;
}

/** Confirm the current session is the LATEST owner of this asset. */
export async function requireOwnership(assetId: string): Promise<string> {
  const session = await getOwnerSession();
  const phone = session.data.phone;
  if (!phone) throw new Error("Not signed in");
  const { data: latest } = await supabaseAdmin
    .from("ownership_records")
    .select("owner_phone")
    .eq("asset_id", assetId)
    .order("acquired_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest || latest.owner_phone !== phone) {
    await session.clear();
    throw new Error("Ownership has been transferred. Access revoked.");
  }
  return phone;
}

/** Assets where this phone is the latest owner. */
export async function listOwnedAssetIds(phone: string): Promise<string[]> {
  const { data: rows } = await supabaseAdmin
    .from("ownership_records")
    .select("asset_id, owner_phone, acquired_at")
    .order("acquired_at", { ascending: false });
  const seen = new Set<string>();
  const owned: string[] = [];
  for (const r of rows ?? []) {
    if (seen.has(r.asset_id)) continue;
    seen.add(r.asset_id);
    if (r.owner_phone === phone) owned.push(r.asset_id);
  }
  return owned;
}
