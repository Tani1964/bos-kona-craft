import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
         documentary (video_path, poster_path, title, runtime, year, format, synopsis, chapters, credits),
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
    // signed video url if private
    let videoUrl: string | null = null;
    const docVideo = (asset.documentary as any)?.video_path as string | undefined;
    if (docVideo) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documentary")
        .createSignedUrl(docVideo, 60 * 60);
      videoUrl = signed?.signedUrl ?? null;
    }
    return { ...asset, video_url: videoUrl };
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
  .inputValidator((d: { serial: string; model_name: string }) =>
    z
      .object({
        serial: z.string().min(1).max(64).regex(/^[A-Z0-9-]+$/i),
        model_name: z.string().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: a, error } = await supabaseAdmin
      .from("assets")
      .insert({ serial: data.serial.toUpperCase(), model_name: data.model_name })
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
