import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeKfiV2 } from "@/lib/passport/kfi";


// ── Public reads ──────────────────────────────────────────────

export const listAssetsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .select("id, serial, model_name, status, lot, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPassport = createServerFn({ method: "GET" })
  .inputValidator((d: { serial: string }) =>
    z.object({ serial: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: asset, error } = await supabaseAdmin
      .from("assets")
      .select(
        `id, serial, model_name, status, lot, hero_style, store_product_id,
         asset_telemetry (wears, nfc_scans, care_entries, repairs, age_days),
         provenance_stages (id, position, icon_key, label, title, body, location, date_text),
         makers (id, position, name, role, years),
         atelier (name, location, lat, lng),
         documentary (video_path, poster_path, title, runtime, year, format, synopsis, chapters, credits, external_url, transform_external_url),
         module_overrides (module_id, title_override, subtitle_override, thumbnail_override),
         ownership_records (id, store_order_id, owner_ref, event_type, acquired_at, notes)`,
      )
      .eq("serial", data.serial)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) return null;
    // sort children
    asset.provenance_stages?.sort((a: any, b: any) => a.position - b.position);
    asset.makers?.sort((a: any, b: any) => a.position - b.position);
    asset.ownership_records?.sort(
      (a: any, b: any) =>
        new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime(),
    );
    // Films are hosted externally — the passport only stores the link, never the file.
    const doc = (asset.documentary as any) ?? {};
    const filmOrigin = (doc.external_url as string | null) ?? null;
    const filmTransform = (doc.transform_external_url as string | null) ?? null;
    return {
      ...asset,
      film_origin_url: filmOrigin,
      film_transform_url: filmTransform,
      video_url: filmOrigin,
    };
  });

// Live behavior+environment signals derived from wear_events + care_sessions.
// Public read (no PII returned); consumed by the KFI / Longevity engine.
export const getLiveSignals = createServerFn({ method: "GET" })
  .inputValidator((d: { asset_id: string }) =>
    z.object({ asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [{ data: wear }, { data: care }] = await Promise.all([
      supabaseAdmin
        .from("wear_events")
        .select("started_at, ended_at, effective_stress")
        .eq("asset_id", data.asset_id)
        .gte("started_at", ninetyDaysAgo)
        .order("started_at", { ascending: false }),
      supabaseAdmin
        .from("care_sessions")
        .select("started_at, ended_at, status")
        .eq("asset_id", data.asset_id)
        .gte("started_at", ninetyDaysAgo)
        .order("started_at", { ascending: false }),
    ]);

    const wearEvents = wear?.length ?? 0;
    const effectiveStress = (wear ?? []).reduce(
      (acc, w: any) => acc + (Number(w.effective_stress) || 0),
      0,
    );
    const lastWear = wear?.[0]?.started_at as string | undefined;

    const completedCare = (care ?? []).filter(
      (c: any) => c.status === "complete" || c.ended_at,
    );
    const careSessions = completedCare.length;
    const lastCare = completedCare[0]?.ended_at ?? completedCare[0]?.started_at;

    const now = Date.now();
    const daysSinceWear = lastWear
      ? Math.floor((now - new Date(lastWear).getTime()) / 86400000)
      : null;
    const daysSinceCare = lastCare
      ? Math.floor((now - new Date(lastCare).getTime()) / 86400000)
      : null;

    return {
      wearEvents,
      effectiveStress: +effectiveStress.toFixed(2),
      careSessions,
      daysSinceWear,
      daysSinceCare,
    };
  });

// KFI v2 — server-aggregated, returns {score, trend, components}.
// Public read: no PII; pulls 180d of wear/care to compute current vs previous window.
export const getKfi = createServerFn({ method: "GET" })
  .inputValidator((d: { asset_id: string }) =>
    z.object({ asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const windowDays = 90;
    const since = new Date(
      Date.now() - 2 * windowDays * 86400000,
    ).toISOString();

    const [{ data: tele }, { data: wear }, { data: care }] = await Promise.all([
      supabaseAdmin
        .from("asset_telemetry")
        .select("age_days, repairs, nfc_scans")
        .eq("asset_id", data.asset_id)
        .maybeSingle(),
      supabaseAdmin
        .from("wear_events")
        .select("started_at, ended_at, effective_stress")
        .eq("asset_id", data.asset_id)
        .gte("started_at", since),
      supabaseAdmin
        .from("care_sessions")
        .select("started_at, ended_at, status")
        .eq("asset_id", data.asset_id)
        .gte("started_at", since),
    ]);

    const result = computeKfiV2({
      wears: wear ?? [],
      cares: care ?? [],
      ageDays: tele?.age_days ?? 0,
      repairs: tele?.repairs ?? 0,
      nfcScans: tele?.nfc_scans ?? 0,
      windowDays,
    });

    return { ...result, windowDays };
  });





// ── Admin: list / create / detail ─────────────────────────────

async function assertAdmin(ctx: { userId: string }) {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Forbidden");
}

export const adminListAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("id, serial, model_name, status, updated_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { serial: string; model_name: string; store_product_id?: string }) =>
    z
      .object({
        serial: z.string().min(1).max(64).regex(/^[A-Z0-9-]+$/i),
        model_name: z.string().min(1).max(120),
        store_product_id: z.string().max(128).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: a, error } = await supabaseAdmin
      .from("assets")
      .insert({
        serial: data.serial.toUpperCase(),
        model_name: data.model_name,
        store_product_id: data.store_product_id || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("asset_telemetry").insert({ asset_id: a.id });
    await supabaseAdmin.from("documentary").insert({ asset_id: a.id });
    return a;
  });

export const getAssetForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: asset, error } = await supabaseAdmin
      .from("assets")
      .select(
        `id, serial, model_name, status, lot, hero_style,
         asset_telemetry (wears, nfc_scans, care_entries, repairs, age_days),
         provenance_stages (id, position, icon_key, label, title, body, location, date_text),
         makers (id, position, name, role, years),
         atelier (name, location, lat, lng),
         documentary (video_path, poster_path, title, runtime, year, format, synopsis, chapters, credits)`,
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    asset.provenance_stages?.sort((a: any, b: any) => a.position - b.position);
    asset.makers?.sort((a: any, b: any) => a.position - b.position);
    return asset;
  });

// ── Admin: section saves ──────────────────────────────────────

export const saveIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        id: z.string().uuid(),
        model_name: z.string().min(1).max(120),
        status: z.string().min(1).max(40),
        lot: z.string().max(40).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("assets")
      .update({ model_name: data.model_name, status: data.status, lot: data.lot ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StageSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(0).max(20),
  icon_key: z.string().min(1).max(20),
  label: z.string().min(1).max(60),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(800),
  location: z.string().min(1).max(120),
  date_text: z.string().min(1).max(60),
});

export const saveProvenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ asset_id: z.string().uuid(), stages: z.array(StageSchema).max(12) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await supabaseAdmin.from("provenance_stages").delete().eq("asset_id", data.asset_id);
    if (data.stages.length) {
      const rows = data.stages.map((s, i) => ({ ...s, id: undefined, asset_id: data.asset_id, position: i }));
      const { error } = await supabaseAdmin.from("provenance_stages").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const MakerSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(0).max(50),
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(80),
  years: z.string().min(1).max(20),
});

export const saveMakers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ asset_id: z.string().uuid(), makers: z.array(MakerSchema).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await supabaseAdmin.from("makers").delete().eq("asset_id", data.asset_id);
    if (data.makers.length) {
      const rows = data.makers.map((m, i) => ({ ...m, id: undefined, asset_id: data.asset_id, position: i }));
      const { error } = await supabaseAdmin.from("makers").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveAtelier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        asset_id: z.string().uuid(),
        name: z.string().min(1).max(120),
        location: z.string().min(1).max(160),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("atelier")
      .upsert({ ...data }, { onConflict: "asset_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ChapterSchema = z.object({ t: z.string().min(1).max(80), time: z.string().min(1).max(12) });
const CreditSchema = z.object({ role: z.string().min(1).max(60), name: z.string().min(1).max(80) });

export const saveDocumentary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        asset_id: z.string().uuid(),
        title: z.string().min(1).max(160),
        runtime: z.string().min(1).max(10),
        year: z.string().min(1).max(8),
        format: z.string().min(1).max(60),
        synopsis: z.string().max(2000),
        video_path: z.string().max(300).nullable().optional(),
        external_url: z.string().url().max(600).nullable().optional().or(z.literal("")),
        transform_external_url: z.string().url().max(600).nullable().optional().or(z.literal("")),
        chapters: z.array(ChapterSchema).max(40),
        credits: z.array(CreditSchema).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("documentary")
      .upsert({ ...data }, { onConflict: "asset_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Storage: signed upload URL for documentary ────────────────

export const getDocumentaryUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        asset_id: z.string().uuid(),
        filename: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const path = `${data.asset_id}/${Date.now()}-${data.filename}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("documentary")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// ── Admin bootstrap: first signed-in user can claim admin if none exist ──

export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { granted: false };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true };
  });

// ── Admin: ownership records ──────────────────────────────────

export const adminListOwnership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { asset_id: string }) =>
    z.object({ asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await supabaseAdmin
      .from("ownership_records")
      .select("id, store_order_id, owner_ref, owner_phone, event_type, acquired_at, notes")
      .eq("asset_id", data.asset_id)
      .order("acquired_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminAddOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        asset_id: z.string().uuid(),
        owner_phone: z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164")
          .nullable()
          .optional(),
        owner_ref: z.string().max(120).nullable().optional(),
        store_order_id: z.string().max(120).nullable().optional(),
        event_type: z.enum(["purchase", "transfer", "resale", "gift"]),
        notes: z.string().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin.from("ownership_records").insert({
      asset_id: data.asset_id,
      owner_phone: data.owner_phone || null,
      owner_ref: data.owner_ref || null,
      store_order_id: data.store_order_id || null,
      event_type: data.event_type,
      notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("ownership_records")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { admin: !!data };
  });

// ── Admin: care tools catalog ─────────────────────────────────

export const adminListCareTools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("care_tools")
      .select("tool_id, tool_name, tool_type, kfi_weight, active, created_at")
      .order("active", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CareToolSchema = z.object({
  tool_id: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_-]+$/i, "letters/numbers/_/- only"),
  tool_name: z.string().trim().min(1).max(120),
  tool_type: z.string().trim().min(1).max(60),
  kfi_weight: z.number().min(0).max(10),
  active: z.boolean(),
});

export const adminUpsertCareTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => CareToolSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("care_tools")
      .upsert({ ...data, tool_id: data.tool_id.toLowerCase() }, { onConflict: "tool_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetCareToolActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ tool_id: z.string().min(1).max(60), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin
      .from("care_tools")
      .update({ active: data.active })
      .eq("tool_id", data.tool_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Admin: observability (read-only) ──────────────────────────

export const adminListWearEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await supabaseAdmin
      .from("wear_events")
      .select(
        "id, asset_id, owner_phone, started_at, ended_at, transport_mode, rain_probability, effective_stress, weather_snapshot, assets(serial, model_name)",
      )
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminListCareInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await supabaseAdmin
      .from("care_insights")
      .select(
        "id, asset_id, owner_phone, kind, body, shown_at, created_at, assets(serial, model_name)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminListCronRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await supabaseAdmin.rpc("admin_cron_runs", {
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      jobid: number;
      jobname: string | null;
      schedule: string | null;
      active: boolean | null;
      runid: number | null;
      status: string | null;
      return_message: string | null;
      start_time: string | null;
      end_time: string | null;
      duration_ms: number | null;
    }>;
  });

