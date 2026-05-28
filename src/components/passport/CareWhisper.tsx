import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { dismissInsight, listInsights } from "@/lib/owner.functions";

export function CareWhisper({ assetId }: { assetId: string }) {
  const fetchInsight = useServerFn(listInsights);
  const dismiss = useServerFn(dismissInsight);

  const { data, refetch } = useQuery({
    queryKey: ["careInsight", assetId],
    queryFn: () => fetchInsight({ data: { asset_id: assetId } }).catch(() => ({ insight: null })),
    refetchInterval: 60_000,
  });

  const insight = data?.insight;

  async function onDismiss() {
    if (!insight) return;
    await dismiss({ data: { insight_id: insight.id } });
    refetch();
  }

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-5 mt-4 rounded-xl border border-bronze/30 bg-gradient-to-br from-bronze/10 to-transparent p-4"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">
                Care Intelligence
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                {insight.body}
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
