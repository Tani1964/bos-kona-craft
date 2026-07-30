/**
 * Shared care-tap ingestion: records a care_event and groups taps into a
 * care_session using a 15-minute window per asset + owner.
 * Used by the owner-session tap flow (/tap) and the signed NFC webhook.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SESSION_WINDOW_MIN = 15;

export function classifySession(
  toolsUsed: string[],
  toolTypes: Record<string, string>,
): { status: "in_progress" | "completed"; classification: string | null } {
  const types = new Set(toolsUsed.map((t) => toolTypes[t]).filter(Boolean));
  if (types.has("cleaning") && types.has("finishing")) {
    return { status: "completed", classification: "Completed Maintenance Session" };
  }
  return { status: "in_progress", classification: null };
}

export async function recordTap(params: {
  assetId: string;
  ownerPhone: string;
  toolId: string;
  tappedAt?: string;
  rawPayload?: unknown;
}) {
  const tappedAt = params.tappedAt ?? new Date().toISOString();

  const { data: tool, error: toolErr } = await supabaseAdmin
    .from("care_tools")
    .select("tool_id, tool_name, tool_type, active")
    .eq("tool_id", params.toolId)
    .maybeSingle();
  if (toolErr) throw new Error(toolErr.message);
  if (!tool || !tool.active) throw new Error("Unknown or inactive care tool");

  const windowStart = new Date(
    new Date(tappedAt).getTime() - SESSION_WINDOW_MIN * 60_000,
  ).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("care_sessions")
    .select("id, tools_used")
    .eq("asset_id", params.assetId)
    .eq("owner_phone", params.ownerPhone)
    .eq("status", "in_progress")
    .gte("started_at", windowStart)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId: string;
  let toolsUsed: string[];

  if (existing) {
    sessionId = existing.id;
    toolsUsed = Array.from(new Set([...(existing.tools_used ?? []), params.toolId]));
  } else {
    const { data: created, error: createErr } = await supabaseAdmin
      .from("care_sessions")
      .insert({
        asset_id: params.assetId,
        owner_phone: params.ownerPhone,
        started_at: tappedAt,
        status: "in_progress",
        tools_used: [params.toolId],
      })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(createErr?.message ?? "Session create failed");
    sessionId = created.id;
    toolsUsed = [params.toolId];
  }

  const { error: eventErr } = await supabaseAdmin.from("care_events").insert({
    asset_id: params.assetId,
    owner_phone: params.ownerPhone,
    tool_id: params.toolId,
    session_id: sessionId,
    occurred_at: tappedAt,
    raw_payload: params.rawPayload ?? { source: "owner_session_tap" },
  });
  if (eventErr) throw new Error(eventErr.message);

  const { data: toolRows } = await supabaseAdmin
    .from("care_tools")
    .select("tool_id, tool_type")
    .in("tool_id", toolsUsed);
  const typeMap: Record<string, string> = {};
  (toolRows ?? []).forEach((t) => (typeMap[t.tool_id] = t.tool_type));

  const { status, classification } = classifySession(toolsUsed, typeMap);

  await supabaseAdmin
    .from("care_sessions")
    .update({
      tools_used: toolsUsed,
      status,
      classification,
      ended_at: status === "completed" ? tappedAt : null,
    })
    .eq("id", sessionId);

  return {
    session_id: sessionId,
    session_status: status,
    classification,
    tools_used: toolsUsed,
    tool_name: tool.tool_name as string,
  };
}
