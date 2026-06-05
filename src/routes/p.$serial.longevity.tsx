import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, LineChart, Sparkles, AlertCircle } from "lucide-react";
import { passportQueryOptions } from "@/lib/passport/queries";
import { getLongevity } from "@/lib/owner.functions";

export const Route = createFileRoute("/p/$serial/longevity")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient
      .ensureQueryData(passportQueryOptions(params.serial))
      .catch(() => null);
    if (!data) throw notFound();
    return data;
  },
  component: LongevityPage,
  head: ({ params }) => ({
    meta: [
      { title: `Longevity ${params.serial} — Bos' Kọ́nà` },
      {
        name: "description",
        content: "Projected lifespan range based on your wear, care and environment.",
      },
    ],
  }),
});

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  };
}

function LongevityPage() {
  const { serial } = Route.useParams();
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serial));
  const assetId = (passport as any)?.id as string | undefined;

  const fetchLongevity = useServerFn(getLongevity);
  const {
    data: lon,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["longevity", assetId],
    queryFn: () =>
      assetId
        ? fetchLongevity({ data: { asset_id: assetId } })
        : Promise.resolve(null),
    enabled: !!assetId,
    retry: false,
    staleTime: 60_000,
  });

  const notOwner =
    !!error &&
    /(not signed in|ownership)/i.test((error as Error).message ?? "");

  // Range bar bounds — anchor max around 25 years for visual scale.
  const maxYears = Math.max(25, (lon?.high_years ?? 0) + 5);
  const lowPct = lon ? Math.min(100, (lon.low_years / maxYears) * 100) : 0;
  const highPct = lon ? Math.min(100, (lon.high_years / maxYears) * 100) : 0;
  const widthPct = Math.max(2, highPct - lowPct);

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-32">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md">
          <Link
            to="/p/$serial"
            params={{ serial }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Module · 10
          </span>
          <span className="w-9" />
        </header>

        <section className="px-5 pt-4">
          <motion.h1 {...fade(0)} className="font-serif text-4xl leading-[1.05] tracking-tight">
            Longevity
            <br />
            <span className="text-bronze">Projection</span>
          </motion.h1>
          <motion.p
            {...fade(0.1)}
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            A range, not a promise · {serial}
          </motion.p>
        </section>

        {notOwner && (
          <section className="mt-8 px-5">
            <div className="flex items-start gap-3 rounded-xl border border-bronze/30 bg-bronze/10 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 text-bronze" />
              <div className="space-y-2">
                <p className="font-serif text-sm">
                  Longevity is personal to the verified owner.
                </p>
                <Link
                  to="/claim"
                  search={{ serial } as never}
                  className="inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-bronze underline"
                >
                  Claim or sign in →
                </Link>
              </div>
            </div>
          </section>
        )}

        {!notOwner && isLoading && (
          <section className="mt-10 px-5">
            <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          </section>
        )}

        {!notOwner && lon && (
          <>
            {/* Range card */}
            <motion.section {...fade(0.2)} className="mt-8 px-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 p-5">
                <div className="absolute inset-0 bronze-glow opacity-30" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Projected Lifespan
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">
                      {(lon.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-serif text-6xl font-light leading-none tracking-tight">
                      {lon.low_years}
                    </span>
                    <span className="font-mono text-xl text-muted-foreground">—</span>
                    <span className="font-serif text-6xl font-light leading-none tracking-tight text-bronze">
                      {lon.high_years}
                    </span>
                    <span className="ml-2 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      years
                    </span>
                  </div>

                  {/* Range bar */}
                  <div className="mt-6">
                    <div className="relative h-2 w-full rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0, left: `${lowPct}%` }}
                        animate={{ width: `${widthPct}%`, left: `${lowPct}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-0 h-2 rounded-full bg-gradient-to-r from-bronze/70 to-bronze"
                        style={{ boxShadow: "0 0 18px oklch(0.7 0.14 60 / 0.5)" }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                      <span>0 yrs</span>
                      <span>{Math.round(maxYears)} yrs</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <LineChart className="h-3.5 w-3.5 text-bronze" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      Material: <span className="text-foreground">{lon.material}</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Components */}
            <motion.section {...fade(0.35)} className="mt-6 px-5">
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                What's shaping it
              </h2>
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
                <Row label="Base lifespan" value={`${lon.components.materialBaseYears} yrs`} />
                <Row label="Wears / year" value={`${lon.components.wearsPerYear}`} />
                <Row label="Care ratio" value={`${lon.components.careRatio.toFixed(2)}`} />
                <Row label="Stress / wear" value={`${lon.components.stressPerWear}`} />
                <Row
                  label="Care factor"
                  value={`×${lon.components.careFactor}`}
                  tone={lon.components.careFactor >= 1 ? "good" : "bad"}
                />
                <Row
                  label="Stress factor"
                  value={`×${lon.components.stressFactor}`}
                  tone={lon.components.stressFactor >= 1 ? "good" : "bad"}
                />
                <Row
                  label="Transport factor"
                  value={`×${lon.components.transportFactor}`}
                  tone={lon.components.transportFactor >= 1 ? "good" : "bad"}
                />
                {lon.components.repairBonusYears > 0 && (
                  <Row
                    label="Repair credit"
                    value={`+${lon.components.repairBonusYears} yrs`}
                    tone="good"
                  />
                )}
              </div>
            </motion.section>

            {/* Transport mix */}
            <motion.section {...fade(0.45)} className="mt-6 px-5">
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Transport mix
              </h2>
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div
                  className="bg-terracotta"
                  style={{ width: `${lon.transportMix.walking * 100}%` }}
                />
                <div
                  className="bg-bronze"
                  style={{ width: `${lon.transportMix.transit * 100}%` }}
                />
                <div
                  className="bg-verified/70"
                  style={{ width: `${lon.transportMix.car * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>Walk {Math.round(lon.transportMix.walking * 100)}%</span>
                <span>Transit {Math.round(lon.transportMix.transit * 100)}%</span>
                <span>Car {Math.round(lon.transportMix.car * 100)}%</span>
              </div>
            </motion.section>

            {/* Notes */}
            {lon.notes.length > 0 && (
              <motion.section {...fade(0.55)} className="mt-6 px-5">
                <h2 className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-bronze" /> Observations
                </h2>
                <ul className="space-y-2">
                  {lon.notes.map((n, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-3 font-serif text-sm leading-relaxed text-foreground/90"
                    >
                      {n}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            <p className="mt-8 px-5 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Window: last {lon.windowDays} days · range tightens as you log more wears
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={
          tone === "good"
            ? "text-verified"
            : tone === "bad"
              ? "text-terracotta"
              : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
