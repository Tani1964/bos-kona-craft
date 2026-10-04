// Fallback-first wear confirmation.
//
// Works with or without push: if a notification arrived, this is the screen it
// opens onto; if none ever arrived, the same card is simply waiting here.
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, X } from "lucide-react";
import {
  getWearState,
  observeMyPresence,
  confirmMyWear,
  declineMyWear,
  dismissMyWear,
} from "@/lib/wear.functions";

export function useWearState() {
  const fetchState = useServerFn(getWearState);
  return useQuery({
    queryKey: ["wearState"],
    queryFn: () => fetchState().catch(() => null),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

/**
 * Quiet presence check at app open — only when location is ALREADY granted, so
 * the owner is never prompted by a page load.
 */
function usePassivePresence(enabled: boolean) {
  const observe = useServerFn(observeMyPresence);
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    ran.current = true;

    const run = () =>
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await observe({
              data: {
                lat: +pos.coords.latitude.toFixed(4),
                lng: +pos.coords.longitude.toFixed(4),
              },
            });
            qc.invalidateQueries({ queryKey: ["wearState"] });
          } catch {
            /* silent — detection is never load-bearing */
          }
        },
        () => {},
        { maximumAge: 600_000, timeout: 8000 },
      );

    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state === "granted") run();
      })
      .catch(() => {});
  }, [enabled]);
}

export function PendingWearPrompt({ assetId }: { assetId?: string }) {
  const { data } = useWearState();
  const qc = useQueryClient();
  usePassivePresence(!!data?.owner && !!data?.settings?.wear_intelligence);

  const confirm = useServerFn(confirmMyWear);
  const decline = useServerFn(declineMyWear);
  const dismiss = useServerFn(dismissMyWear);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["wearState"] });
    qc.invalidateQueries({ queryKey: ["liveSignals"] });
    qc.invalidateQueries({ queryKey: ["kfi"] });
    qc.invalidateQueries({ queryKey: ["passport"] });
  };

  const mConfirm = useMutation({
    mutationFn: (id: string) => confirm({ data: { id } }),
    onSuccess: invalidate,
  });
  const mDecline = useMutation({
    mutationFn: (v: { id: string; scope: "pair" | "outing" }) =>
      decline({ data: v }),
    onSuccess: invalidate,
  });
  const mDismiss = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: invalidate,
  });

  const pending = (data?.pending ?? []) as any[];
  const shown = assetId
    ? pending.filter((p) => p.asset_id === assetId)
    : pending;
  if (!data?.owner || shown.length === 0) return null;

  const multi = shown.length > 1;

  return (
    <AnimatePresence>
      {shown.map((p) => (
        <motion.section
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-5 mt-6 rounded-2xl border border-bronze/25 bg-bronze/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4 text-bronze" />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">
                Unconfirmed
              </p>
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => mDismiss.mutate(p.id)}
              className="text-muted-foreground active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 font-serif text-xl leading-snug">
            You seem to be out.{" "}
            {p.assets?.model_name
              ? `Wearing the ${p.assets.model_name} today?`
              : "Wearing this pair today?"}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Nothing is recorded until you say so
          </p>

          <div className="mt-4 flex gap-2">
            <button
              disabled={mConfirm.isPending}
              onClick={() => mConfirm.mutate(p.id)}
              className="h-11 flex-1 rounded-lg bg-bronze text-sm font-bold text-stone-950 active:scale-[0.98] disabled:opacity-60"
            >
              Yes, Wearing
            </button>
            <button
              disabled={mDecline.isPending}
              onClick={() =>
                mDecline.mutate({ id: p.id, scope: multi ? "pair" : "outing" })
              }
              className="h-11 flex-1 rounded-lg border border-white/15 bg-white/5 text-sm text-foreground active:scale-[0.98]"
            >
              {multi ? "Not this pair" : "No, Not Today"}
            </button>
          </div>
        </motion.section>
      ))}
    </AnimatePresence>
  );
}
