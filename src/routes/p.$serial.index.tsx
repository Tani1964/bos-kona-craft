import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  ShieldCheck,
  Footprints,
  Shield,
  Sparkles,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { productUrl } from "@/lib/storefront/boskona";

import { KfiRing } from "@/components/passport/KfiRing";
import { ModuleCard } from "@/components/passport/ModuleCard";
import { CareSheet } from "@/components/passport/CareSheet";
import { OutTheDoorSheet } from "@/components/passport/OutTheDoorSheet";
import { CareWhisper } from "@/components/passport/CareWhisper";
import { OwnerChip } from "@/components/passport/OwnerChip";
import * as ownerFns from "@/lib/owner.functions";
import { getLiveSignals, getKfi } from "@/lib/passport.functions";
import { resolveFeed, type ThumbnailStyle } from "@/lib/passport/ecosystem";
import { getWatchedFilms } from "@/lib/passport/watched";
import {
  deriveStage,
  deriveRecommendation,
  estimateLifespanYears,
  type AssetTelemetry,
} from "@/lib/passport/state-engine";
import { passportQueryOptions } from "@/lib/passport/queries";


function Thumb({ style }: { style: ThumbnailStyle }) {
  if (style.kind === "gradient") {
    return (
      <div
        className={`h-full w-full bg-gradient-to-br ${style.from} ${style.via ?? ""} ${style.to}`}
      />
    );
  }
  if (style.kind === "radial") {
    return (
      <div
        className="h-full w-full"
        style={{ background: `radial-gradient(${style.spec.replace(/_/g, " ")})` }}
      />
    );
  }
  return null;
}

export const Route = createFileRoute("/p/$serial/")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient
      .ensureQueryData(passportQueryOptions(params.serial))
      .catch(() => null);
    if (!data) throw notFound();
    return data;
  },
  component: PassportPage,
  head: ({ params }) => ({
    meta: [
      { title: `Passport ${params.serial} — Bos' Kọ́nà` },
      {
        name: "description",
        content: "Afro-futurist craft passport for bespoke pieces.",
      },
    ],
  }),
});

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  };
}

function PassportPage() {
  const { serial: serialParam } = Route.useParams();
  const [careOpen, setCareOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serialParam));
  const t = (passport?.asset_telemetry as any) ?? null;
  const assetIdEarly = (passport as any)?.id as string | undefined;

  const fetchLive = useServerFn(getLiveSignals);
  const { data: live } = useQuery({
    queryKey: ["liveSignals", assetIdEarly],
    queryFn: () =>
      assetIdEarly
        ? fetchLive({ data: { asset_id: assetIdEarly } }).catch(() => null)
        : Promise.resolve(null),
    enabled: !!assetIdEarly,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const telemetry: AssetTelemetry = {
    wears: t?.wears ?? 0,
    careEntries: t?.care_entries ?? 0,
    nfcScans: t?.nfc_scans ?? 0,
    ageDays: t?.age_days ?? 0,
    repairs: t?.repairs ?? 0,
    wearEvents: live?.wearEvents,
    effectiveStress: live?.effectiveStress,
    careSessions: live?.careSessions,
    daysSinceCare: live?.daysSinceCare,
    daysSinceWear: live?.daysSinceWear,
  };

  const fetchKfi = useServerFn(getKfi);
  const { data: kfiData } = useQuery({
    queryKey: ["kfi", assetIdEarly],
    queryFn: () =>
      assetIdEarly
        ? fetchKfi({ data: { asset_id: assetIdEarly } }).catch(() => null)
        : Promise.resolve(null),
    enabled: !!assetIdEarly,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  // Fallback score from telemetry while server KFI loads (keeps SSR/first-paint stable).
  const fallbackScore = clampScore(
    100 -
      Math.min(telemetry.wears * 0.6, 30) -
      Math.min((telemetry.ageDays / 365) * 1.2, 15) +
      Math.min(telemetry.careEntries * 3, 25),
  );
  const score = kfiData?.score ?? fallbackScore;
  const stage = deriveStage(score);
  const lifespan = estimateLifespanYears(telemetry);
  const recommendation = deriveRecommendation(telemetry);
  const [watchedFilms, setWatchedFilms] = useState<string[]>([]);
  useEffect(() => {
    setWatchedFilms(getWatchedFilms());
  }, []);
  const feed = resolveFeed(telemetry, serialParam, {
    films: {
      origin: (passport as any)?.film_origin_url ?? null,
      transform: (passport as any)?.film_transform_url ?? null,
    },
    watchedFilms,
  });


  const modelName = passport?.model_name ?? "—";
  const status = passport?.status ?? "New";
  const serial = passport?.serial ?? serialParam;
  const storeProductId = (passport as any)?.store_product_id as string | null | undefined;
  const assetId = (passport as any)?.id as string | undefined;

  const fetchOpenEvent = useServerFn(ownerFns.getOpenWearEvent);
  const { data: openCtx } = useQuery({
    queryKey: ["openWearEvent", assetId],
    queryFn: () =>
      assetId
        ? fetchOpenEvent({ data: { asset_id: assetId } }).catch(() => ({
            owner: false as const,
            event: null,
          }))
        : Promise.resolve({ owner: false as const, event: null }),
    enabled: !!assetId,
    refetchOnWindowFocus: true,
  });
  const isOwner = !!openCtx?.owner;
  const openEvent = openCtx?.event ?? null;

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-32">
        <motion.header
          {...fade(0)}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <Link
            to="/me"
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground"
          >
            Bos' Kọ́nà
          </Link>
          <div className="flex items-center gap-2">
            <OwnerChip />
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95">
              <ShoppingBag className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </motion.header>

        <section className="px-5 pt-4">
          <motion.h1
            {...fade(0.05)}
            className="font-serif text-4xl leading-[1.05] tracking-tight text-foreground"
          >
            {modelName}
            <br />
            <span className="text-bronze">{status}</span>
          </motion.h1>
          <motion.p
            {...fade(0.12)}
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            Asset // {serial}
          </motion.p>

          {storeProductId && (
            <motion.a
              {...fade(0.15)}
              href={productUrl(storeProductId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-bronze hover:text-bronze/80"
            >
              Purchased at Bos' Kọ́nà
              <ExternalLink className="h-3 w-3" />
            </motion.a>
          )}

          <motion.div {...fade(0.18)} className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/30 bg-verified/10 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-verified" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-verified">
                Authentic
              </span>
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Verified Owner
              </span>
            </span>
          </motion.div>
        </section>

        {assetId && isOwner && <CareWhisper assetId={assetId} />}

        <section className="mt-8 px-5">
          <KfiRing score={score} stage={stage} />

          {kfiData && (
            <motion.div
              {...fade(0.55)}
              className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
            >
              <TrendIcon dir={kfiData.trend.direction} />
              <span>
                {kfiData.trend.direction === "flat"
                  ? "Stable vs last 90d"
                  : `${kfiData.trend.delta > 0 ? "+" : ""}${kfiData.trend.delta} vs last 90d`}
              </span>
            </motion.div>
          )}

          <motion.div
            {...fade(0.6)}
            className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <KfiStat
              label="Maintenance"
              value={kfiData?.components.maintenanceConsistency.score ?? 0}
              note={kfiData?.components.maintenanceConsistency.note}
            />
            <KfiStat
              label="Responsiveness"
              value={kfiData?.components.careResponsiveness.score ?? 0}
              note={kfiData?.components.careResponsiveness.note}
            />
            <KfiStat
              label="Env. Load"
              value={kfiData?.components.environmentalLoad.score ?? 0}
              note={kfiData?.components.environmentalLoad.note}
            />
            <KfiStat
              label="Cadence"
              value={kfiData?.components.cadenceHealth.score ?? 0}
              note={kfiData?.components.cadenceHealth.note}
            />
          </motion.div>

          <motion.p
            {...fade(0.75)}
            className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            Estimated lifespan at current wear rate:{" "}
            <span className="text-bronze">{lifespan} Years</span>
          </motion.p>
        </section>


        <section className="mt-8 px-5">
          <motion.h2
            {...fade(0.4)}
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            Passport Modules
          </motion.h2>

          {feed.map((m, i) => {
            const Icon = m.icon;
            return (
              <ModuleCard
                key={m.id}
                index={i}
                to={m.to}
                title={m.title}
                subtitle={m.resolvedSubtitle}
                search={m.search}
                video={m.video}
                thumbnail={m.thumbnail ? <Thumb style={m.thumbnail} /> : undefined}
                icon={<Icon className="h-5 w-5 text-bronze" />}
              />
            );
          })}
        </section>
      </main>

      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 bg-stone-950/90 px-4 pt-3 pb-safe backdrop-blur-xl"
        style={{ boxShadow: "0 -20px 40px -10px oklch(0 0 0 / 0.5)" }}
      >
        <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="flex items-center gap-1.5 rounded-full border border-bronze/30 bg-stone-900/95 px-3 py-1.5 shadow-lg"
          >
            <Sparkles className="h-3 w-3 text-bronze" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Recommendation:{" "}
              <span className="text-foreground">{recommendation.title}</span>
            </span>
          </motion.div>
        </div>

        <div className="flex gap-3">
          {isOwner ? (
            <button
              onClick={() => setOutOpen(true)}
              className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-lg font-bold transition active:scale-[0.98] ${
                openEvent
                  ? "border border-bronze/40 bg-bronze/15 text-bronze"
                  : "bg-bronze text-stone-950"
              }`}
            >
              <Footprints className="h-5 w-5" />
              <span className="text-sm tracking-wide">
                {openEvent ? "Back Home" : "Out the Door"}
              </span>
            </button>
          ) : (
            <Link
              to="/claim"
              search={{ serial } as never}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-bronze font-bold text-stone-950 transition active:scale-[0.98]"
            >
              <Footprints className="h-5 w-5" />
              <span className="text-sm tracking-wide">Out the Door</span>
            </Link>
          )}
          <button
            onClick={() => setCareOpen(true)}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 font-bold text-foreground transition active:scale-[0.98]"
          >
            <Shield className="h-5 w-5" />
            <span className="text-sm tracking-wide">Log Care</span>
          </button>
        </div>
      </motion.footer>

      <CareSheet open={careOpen} onClose={() => setCareOpen(false)} />
      {assetId && (
        <OutTheDoorSheet
          open={outOpen}
          onClose={() => setOutOpen(false)}
          assetId={assetId}
          openEvent={openEvent as any}
        />
      )}
    </div>
  );
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, n));
}

function scoreTone(v: number): string {
  if (v >= 75) return "text-verified";
  if (v >= 45) return "text-bronze";
  return "text-terracotta";
}

function KfiStat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 px-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-lg font-medium ${scoreTone(value)}`}>
        {Math.round(value)}
      </span>
      {note && (
        <span className="font-mono text-[9px] leading-tight text-muted-foreground/70">
          {note}
        </span>
      )}
    </div>
  );
}

function TrendIcon({ dir }: { dir: "up" | "flat" | "down" }) {
  if (dir === "up") return <TrendingUp className="h-3.5 w-3.5 text-verified" />;
  if (dir === "down") return <TrendingDown className="h-3.5 w-3.5 text-terracotta" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

