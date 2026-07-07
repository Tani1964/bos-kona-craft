/**
 * Bos' Kọ́nà NFC Care Tap
 * ---------------------------------------------------------------
 * Physical care tools (Premium Brush, Microfiber Cloth, etc.) embed
 * an NFC chip whose URL points here with a signed payload. A tap
 * records a `care_event` and intelligently groups taps into a
 * `care_session` (15-minute window per asset+owner) so that
 *
 *   brush tap → cloth tap (within 15m)
 *
 * registers as ONE "Completed Maintenance Session", not two events.
 *
 * Security: HMAC-SHA256 over the raw body using NFC_TAP_SECRET.
 * Until the secret is set the endpoint fails closed.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SESSION_WINDOW_MIN = 15;

const Payload = z.object({
  asset_serial: z.string().min(1).max(64),
  tool_id: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  owner_phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  tapped_at: z.string().datetime().optional(),
});

function verify(body: string, sig: string | null): boolean {
  const secret = process.env.NFC_TAP_SECRET;
  if (!secret || !sig) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function classify(toolsUsed: string[], toolTypes: Record<string, string>): {
  status: "in_progress" | "completed";
  classification: string | null;
} {
  const types = new Set(toolsUsed.map((t) => toolTypes[t]).filter(Boolean));
  if (types.has("cleaning") && types.has("finishing")) {
    return { status: "completed", classification: "Completed Maintenance Session" };
  }
  return { status: "in_progress", classification: null };
}

export const Route = createFileRoute("/api/public/nfc-tap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("x-boskona-nfc-signature");
        if (!verify(raw, sig)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let data;
        try {
          data = Payload.parse(JSON.parse(raw));
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "Invalid payload", details: String(err) }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const tappedAt = data.tapped_at ?? new Date().toISOString();

        // 1. Resolve asset by serial
        const { data: asset, error: assetErr } = await supabaseAdmin
          .from("assets")
          .select("id")
          .eq("serial", data.asset_serial)
          .maybeSingle();
        if (assetErr) {
          return new Response(JSON.stringify({ error: assetErr.message }), { status: 500 });
        }
        if (!asset) {
          return new Response(JSON.stringify({ error: "Unknown asset_serial" }), { status: 404 });
        }

        // 2. Validate tool exists & is active
        const { data: tool, error: toolErr } = await supabaseAdmin
          .from("care_tools")
          .select("tool_id, tool_type, active")
          .eq("tool_id", data.tool_id)
          .maybeSingle();
        if (toolErr) {
          return new Response(JSON.stringify({ error: toolErr.message }), { status: 500 });
        }
        if (!tool || !tool.active) {
          return new Response(JSON.stringify({ error: "Unknown or inactive tool_id" }), {
            status: 404,
          });
        }

        // 3. Verify the phone is the CURRENT (latest) owner of this asset.
        //    A previous owner whose phone still appears in history must not be
        //    able to record care events after ownership transfers.
        const { data: latestOwn } = await supabaseAdmin
          .from("ownership_records")
          .select("owner_phone")
          .eq("asset_id", asset.id)
          .order("acquired_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latestOwn || latestOwn.owner_phone !== data.owner_phone) {
          return new Response(
            JSON.stringify({ error: "Phone is not the current owner of this asset" }),
            { status: 403 },
          );
        }


        // 4. Find an open session within the 15-minute window
        const windowStart = new Date(
          new Date(tappedAt).getTime() - SESSION_WINDOW_MIN * 60_000,
        ).toISOString();

        const { data: existing } = await supabaseAdmin
          .from("care_sessions")
          .select("id, tools_used, status")
          .eq("asset_id", asset.id)
          .eq("owner_phone", data.owner_phone)
          .eq("status", "in_progress")
          .gte("started_at", windowStart)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let sessionId: string;
        let toolsUsed: string[];

        if (existing) {
          toolsUsed = Array.from(new Set([...(existing.tools_used ?? []), data.tool_id]));
          sessionId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabaseAdmin
            .from("care_sessions")
            .insert({
              asset_id: asset.id,
              owner_phone: data.owner_phone,
              started_at: tappedAt,
              status: "in_progress",
              tools_used: [data.tool_id],
            })
            .select("id")
            .single();
          if (createErr || !created) {
            return new Response(
              JSON.stringify({ error: createErr?.message ?? "Session create failed" }),
              { status: 500 },
            );
          }
          sessionId = created.id;
          toolsUsed = [data.tool_id];
        }

        // 5. Insert the event
        const { error: eventErr } = await supabaseAdmin.from("care_events").insert({
          asset_id: asset.id,
          owner_phone: data.owner_phone,
          tool_id: data.tool_id,
          session_id: sessionId,
          occurred_at: tappedAt,
          raw_payload: data,
        });
        if (eventErr) {
          return new Response(JSON.stringify({ error: eventErr.message }), { status: 500 });
        }

        // 6. Look up all tool types referenced by this session and classify
        const { data: toolRows } = await supabaseAdmin
          .from("care_tools")
          .select("tool_id, tool_type")
          .in("tool_id", toolsUsed);
        const typeMap: Record<string, string> = {};
        (toolRows ?? []).forEach((t) => (typeMap[t.tool_id] = t.tool_type));

        const { status, classification } = classify(toolsUsed, typeMap);

        await supabaseAdmin
          .from("care_sessions")
          .update({
            tools_used: toolsUsed,
            status,
            classification,
            ended_at: status === "completed" ? tappedAt : null,
          })
          .eq("id", sessionId);

        return new Response(
          JSON.stringify({
            ok: true,
            session_id: sessionId,
            session_status: status,
            classification,
            tools_used: toolsUsed,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
