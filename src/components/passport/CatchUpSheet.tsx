// Weekly catch-up — opened by a 7-day fallback notification.
// mode "wear": how many days worn · "care": log a cleaning · "combined": both.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio } from "lucide-react";
import { submitMyCatchUp } from "@/lib/wear.functions";
import type { CatchUpMode } from "@/lib/fallback";

const WEAR_OPTIONS = [
  { v: 0, label: "0 / Resting" },
  { v: 1, label: "1 Day" },
  { v: 2, label: "2 Days" },
  { v: 3, label: "3+ Days" },
];

export function CatchUpSheet({
  mode,
  assetId,
  shoe,
  onClose,
}: {
  mode: CatchUpMode | null;
  assetId: string;
  shoe: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(submitMyCatchUp);
  const [wear, setWear] = useState<number | null>(null);
  const [care, setCare] = useState<boolean | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (v: { wear_days: number | null; care: boolean | null }) =>
      submit({ data: { asset_id: assetId, ...v } }),
    onSuccess: (r) => {
      ["liveSignals", "kfi", "passport", "wearState"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      const parts = [];
      if (r.wearsLogged) parts.push(`${r.wearsLogged} wear${r.wearsLogged > 1 ? "s" : ""} recorded`);
      if (r.careLogged) parts.push("care session recorded");
      setDone(parts.length ? `${parts.join(" · ")}. Your KFI™ is updated.` : "Noted — resting this week.");
      setTimeout(onClose, 1600);
    },
  });

  const showWear = mode === "wear" || mode === "combined";
  const showCare = mode === "care" || mode === "combined";
  const title =
    mode === "care"
      ? `${shoe} Care Check`
      : mode === "wear"
        ? "Weekly Wear Catch-Up"
        : "Weekly Passport Check-In";

  const pill = (active: boolean) =>
    `h-11 rounded-lg border text-sm transition active:scale-[0.97] ${
      active ? "border-bronze bg-bronze text-stone-950 font-bold" : "border-white/15 bg-white/5 text-foreground"
    }`;

  return (
    <AnimatePresence>
      {mode && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-md rounded-t-2xl border-t border-stone-800 bg-stone-900 px-5 pt-5 pb-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">{title}</p>

            {done ? (
              <p className="mt-4 font-serif text-xl">{done}</p>
            ) : (
              <>
                {showWear && (
                  <div className="mt-4">
                    <p className="font-serif text-xl leading-snug">
                      {mode === "combined"
                        ? "How many days did you wear them this week?"
                        : `How many times did you wear your ${shoe} this week?`}
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {WEAR_OPTIONS.map((o) => (
                        <button key={o.v} onClick={() => setWear(o.v)} className={pill(wear === o.v)}>
                          {mode === "combined" ? (o.v === 0 ? "0 / Rested" : `${o.v}x${o.v === 3 ? "+" : ""}`) : o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showCare && (
                  <div className="mt-5">
                    <p className="font-serif text-xl leading-snug">
                      Did you clean or brush them this week?
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => setCare(true)} className={pill(care === true)}>
                        Yes, Log Care
                      </button>
                      <button onClick={() => setCare(false)} className={pill(care === false)}>
                        Not Yet
                      </button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <Radio className="h-3 w-3" /> Or tap your Care Kit NFC chip while cleaning.
                    </p>
                  </div>
                )}

                <button
                  disabled={
                    m.isPending ||
                    (showWear && wear === null) ||
                    (showCare && care === null)
                  }
                  onClick={() => m.mutate({ wear_days: showWear ? wear : null, care: showCare ? care : null })}
                  className="mt-6 h-12 w-full rounded-lg bg-bronze text-sm font-bold text-stone-950 disabled:opacity-40"
                >
                  {m.isPending ? "Saving…" : "Update my passport"}
                </button>
                {m.isError && (
                  <p className="mt-2 font-mono text-[10px] text-terracotta">
                    Couldn't save — make sure you're signed in to this passport.
                  </p>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
