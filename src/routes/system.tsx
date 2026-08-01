import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Cpu, Network, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import {
  computeKfi,
  deriveStage,
  deriveRecommendation,
  estimateLifespanYears,
  type AssetTelemetry,
} from "@/lib/passport/state-engine";
import { resolveFeed } from "@/lib/passport/ecosystem";

export const Route = createFileRoute("/system")({
  component: SystemPage,
  head: () => ({
    meta: [{ title: "System — State Engine & Ecosystem" }],
  }),
});

const PRESETS: { label: string; t: AssetTelemetry }[] = [
  { label: "New", t: { wears: 2, careEntries: 0, nfcScans: 1, ageDays: 14, repairs: 0 } },
  { label: "Breaking In", t: { wears: 30, careEntries: 4, nfcScans: 7, ageDays: 210, repairs: 0 } },
  { label: "Seasoned", t: { wears: 80, careEntries: 10, nfcScans: 18, ageDays: 720, repairs: 1 } },
  { label: "Venerated", t: { wears: 240, careEntries: 22, nfcScans: 40, ageDays: 2400, repairs: 4 } },
];

function SystemPage() {
  const [idx, setIdx] = useState(1);
  const t = PRESETS[idx].t;
  const kfi = computeKfi(t);
  const stage = deriveStage(kfi.score);
  const lifespan = estimateLifespanYears(t);
  const rec = deriveRecommendation(t);
  const feed = resolveFeed(t, undefined, { includeLocked: true });

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-32">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:scale-95">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Modules · 14 / 15
          </span>
          <span className="w-9" />
        </header>

        <section className="px-5 pt-4">
          <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
            State Engine
            <br />
            <span className="text-bronze">& Ecosystem</span>
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            The unseen brain behind the passport
          </p>
        </section>

        {/* Telemetry presets */}
        <section className="mt-6 px-5">
          <div className="mb-2 flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-bronze" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Telemetry Scenario
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setIdx(i)}
                className={`rounded-lg border px-2 py-2 font-mono text-[10px] uppercase tracking-wider transition active:scale-95 ${
                  i === idx
                    ? "border-bronze/60 bg-bronze/15 text-bronze"
                    : "border-white/10 bg-white/5 text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* KFI breakdown */}
        <section className="mt-6 px-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                KFI Score
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
                {stage}
              </span>
            </div>
            <div className="mt-1 font-serif text-5xl font-light leading-none">
              {kfi.score.toFixed(1)}
            </div>
            <div className="mt-4 space-y-1.5">
              <Row label="Base" value={kfi.base} />
              <Row label="Wear" value={kfi.wearImpact} />
              <Row label="Age" value={kfi.ageImpact} />
              <Row label="Care" value={kfi.careImpact} />
              <Row label="Repairs" value={kfi.repairImpact} />
              <Row label="NFC trust" value={kfi.nfcImpact} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Est. lifespan
              </span>
              <span className="font-mono text-sm text-bronze">{lifespan} yrs</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Recommendation
              </span>
              <span className="font-mono text-xs text-foreground">{rec.title}</span>
            </div>
          </div>
        </section>

        {/* Ecosystem resolution */}
        <section className="mt-6 px-5">
          <div className="mb-2 flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-bronze" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Resolved Feed
            </span>
          </div>
          <div className="space-y-2">
            {feed.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    m.locked
                      ? "border-white/5 bg-white/[0.02] opacity-60"
                      : "border-bronze/20 bg-bronze/[0.04]"
                  }`}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(m.ordinal).padStart(2, "0")}
                  </span>
                  <Icon className="h-4 w-4 text-bronze" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-sm">{m.title}</div>
                    <div className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {m.resolvedSubtitle || "—"}
                    </div>
                  </div>
                  {m.locked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-verified" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        <p className="mt-8 px-5 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Engine: pure functions · Ecosystem: declarative registry
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={positive ? "text-verified" : "text-terracotta"}>
        {positive ? "+" : ""}
        {value.toFixed(1)}
      </span>
    </div>
  );
}
