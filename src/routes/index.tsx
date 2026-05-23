import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ShoppingBag,
  ShieldCheck,
  Footprints,
  Shield,
  Sparkles,
  Clock,
  Hammer,
  Film,
  Archive,
} from "lucide-react";
import { KfiRing } from "@/components/passport/KfiRing";
import { ModuleCard } from "@/components/passport/ModuleCard";
import { CareSheet } from "@/components/passport/CareSheet";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Bos' Kọ́nà — Craft Passport" },
      {
        name: "description",
        content:
          "Afro-futurist craft passport. Track wear, provenance, and longevity of bespoke pieces.",
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

function Index() {
  const [careOpen, setCareOpen] = useState(false);
  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-32">
        {/* ── Top Nav ───────────────────────────────────────── */}
        <motion.header
          {...fade(0)}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground">
            Bos' Kọ́nà
          </span>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95">
            <ShoppingBag className="h-4 w-4 text-foreground" />
          </button>
        </motion.header>

        {/* ── Identity ─────────────────────────────────────── */}
        <section className="px-5 pt-4">
          <motion.h1
            {...fade(0.05)}
            className="font-serif text-4xl leading-[1.05] tracking-tight text-foreground"
          >
            Air Formula F1
            <br />
            <span className="text-bronze">New</span>
          </motion.h1>
          <motion.p
            {...fade(0.12)}
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            Asset // 8F92-A4B1
          </motion.p>

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

        {/* ── Intelligence Engine ──────────────────────────── */}
        <section className="mt-8 px-5">
          <KfiRing score={92.6} stage="Breaking In" />

          <motion.div
            {...fade(0.6)}
            className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <Stat label="Wear" value="-15.0" tone="bad" />
            <Stat label="Age" value="-2.4" tone="bad" />
            <Stat label="Care" value="+10.0" tone="good" />
          </motion.div>

          <motion.p
            {...fade(0.75)}
            className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            Estimated lifespan at current wear rate:{" "}
            <span className="text-bronze">4.2 Years</span>
          </motion.p>
        </section>

        {/* ── Dynamic Module Feed ──────────────────────────── */}
        <section className="mt-8 px-5">
          <motion.h2
            {...fade(0.4)}
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            Passport Modules
          </motion.h2>

          <ModuleCard
            index={0}
            title="Ownership Timeline"
            subtitle="30 Wears Logged"
            thumbnail={
              <div className="h-full w-full bg-gradient-to-br from-leather via-terracotta to-stone-900" />
            }
            icon={<Clock className="h-5 w-5 text-bronze" />}
          />
          <ModuleCard
            index={1}
            title="Craft Provenance"
            subtitle="Material & Design Journey"
            icon={<Hammer className="h-5 w-5 text-bronze" />}
          />
          <ModuleCard
            index={2}
            title="Documentary: Origin"
            subtitle="12 min · Bespoke Atelier"
            video
            thumbnail={
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.45_0.1_50),oklch(0.12_0.01_50))]" />
            }
          />
          <ModuleCard
            index={3}
            title="Documentary: Transformation"
            subtitle="Unlocks at 50 Wears"
            locked
            thumbnail={
              <div className="h-full w-full bg-[radial-gradient(circle_at_70%_60%,oklch(0.32_0.08_30),oklch(0.1_0.01_30))]" />
            }
          />
          <ModuleCard
            index={4}
            title="Archive Collection Access"
            subtitle="Unlocks at Venerated Stage (KFI < 40)"
            locked
            icon={<Archive className="h-5 w-5 text-bronze" />}
          />
        </section>
      </main>

      {/* ── Fixed Bottom Action Bar ─────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 bg-stone-950/90 px-4 pt-3 pb-safe backdrop-blur-xl"
        style={{ boxShadow: "0 -20px 40px -10px oklch(0 0 0 / 0.5)" }}
      >
        {/* Care recommendation pill */}
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
              <span className="text-foreground">Condition Leather</span>
            </span>
          </motion.div>
        </div>

        <div className="flex gap-3">
          <button className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-bronze font-bold text-stone-950 transition active:scale-[0.98]">
            <Footprints className="h-5 w-5" />
            <span className="text-sm tracking-wide">Out the Door</span>
          </button>
          <button className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 font-bold text-foreground transition active:scale-[0.98]">
            <Shield className="h-5 w-5" />
            <span className="text-sm tracking-wide">Log Care</span>
          </button>
        </div>
      </motion.footer>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad";
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`font-mono text-base font-medium ${
          tone === "good" ? "text-verified" : "text-terracotta"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
