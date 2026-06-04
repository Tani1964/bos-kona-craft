import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Hammer,
  Leaf,
  Scissors,
  Stamp,
  MapPin,
  Sparkles,
  Package,
  type LucideIcon,
} from "lucide-react";
import { passportQueryOptions } from "@/lib/passport/queries";

export const Route = createFileRoute("/p/$serial/provenance")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(passportQueryOptions(params.serial)),
  component: ProvenancePage,
  head: ({ params }) => ({
    meta: [
      { title: `Craft Provenance · ${params.serial} · Bos' Kọ́nà` },
      {
        name: "description",
        content:
          "Material origins, atelier journey and the hands behind this bespoke piece.",
      },
    ],
  }),
});

const ICON_MAP: Record<string, LucideIcon> = {
  leaf: Leaf,
  scissors: Scissors,
  hammer: Hammer,
  stamp: Stamp,
  sparkles: Sparkles,
  package: Package,
};

function iconFor(key: string): LucideIcon {
  return ICON_MAP[key?.toLowerCase()] ?? Leaf;
}

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  };
}

function ProvenancePage() {
  const { serial: serialParam } = Route.useParams();
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serialParam));

  const stages = (passport?.provenance_stages ?? []) as any[];
  const makers = (passport?.makers ?? []) as any[];
  const atelier = (passport?.atelier as any) ?? null;
  const serial = passport?.serial ?? serialParam;
  const lot = passport?.lot;

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-16">
        <motion.header
          {...fade(0)}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <Link
            to="/p/$serial"
            params={{ serial: serialParam }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Module · 07
          </span>
          <div className="h-9 w-9" />
        </motion.header>

        <section className="px-5 pt-3">
          <motion.p
            {...fade(0.05)}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze"
          >
            Craft Provenance
          </motion.p>
          <motion.h1
            {...fade(0.1)}
            className="mt-2 font-serif text-3xl leading-[1.05] tracking-tight"
          >
            From hide to<br />heirloom.
          </motion.h1>
          <motion.p
            {...fade(0.18)}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            Asset // {serial}{lot ? ` · Lot ${lot}` : ""}
          </motion.p>
        </section>

        <motion.div
          {...fade(0.24)}
          className="mx-5 mt-6 h-44 overflow-hidden rounded-xl border border-white/10"
        >
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.5_0.12_45),oklch(0.18_0.04_40)_60%,oklch(0.1_0.01_40))]" />
        </motion.div>

        <motion.div
          {...fade(0.3)}
          className="mx-5 mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <Stat label="Stages" value={String(stages.length).padStart(2, "0")} />
          <Stat label="Hands" value={String(makers.length).padStart(2, "0")} />
          <Stat label="Atelier" value={atelier ? "01" : "—"} />
        </motion.div>

        <section className="mt-8 px-5">
          <motion.h2
            {...fade(0.36)}
            className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            The Journey
          </motion.h2>

          {stages.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              No provenance stages recorded yet.
            </p>
          ) : (
            <div className="relative pl-7">
              <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-bronze/40 via-white/10 to-transparent" />
              {stages.map((s, i) => (
                <StageRow key={s.id ?? i} stage={s} index={i} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 px-5">
          <motion.h2
            {...fade(0.5)}
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            The Hands
          </motion.h2>
          {makers.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              No makers listed yet.
            </p>
          ) : (
            <motion.div
              {...fade(0.56)}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
            >
              {makers.map((m, i) => (
                <div
                  key={m.id ?? m.name}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < makers.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10 font-serif text-base text-bronze">
                    {(m.name ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base leading-tight text-foreground">
                      {m.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {m.role}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
                    {m.years}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </section>

        {atelier && (
          <motion.div
            {...fade(0.64)}
            className="mx-5 mt-6 rounded-xl border border-bronze/20 bg-gradient-to-br from-bronze/10 via-white/5 to-transparent p-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-bronze" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze">
                Atelier of Origin
              </span>
            </div>
            <p className="mt-2 font-serif text-xl leading-tight">{atelier.name}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 text-bronze/80" />
              {atelier.location}
              {atelier.lat != null && atelier.lng != null
                ? ` · ${atelier.lat}, ${atelier.lng}`
                : ""}
            </p>
          </motion.div>
        )}

        <motion.p
          {...fade(0.72)}
          className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
        >
          ── Verified provenance ──
        </motion.p>
      </main>
    </div>
  );
}

function StageRow({ stage, index }: { stage: any; index: number }) {
  const Icon = iconFor(stage.icon_key);
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-6"
    >
      <div className="absolute -left-7 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-bronze/50 bg-bronze/10 text-bronze">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bronze/80">
        {stage.label} · {stage.date_text}
      </p>
      <h3 className="mt-1 font-serif text-lg leading-tight text-foreground">
        {stage.title}
      </h3>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {stage.body}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <MapPin className="h-3 w-3 text-bronze/70" />
        {stage.location}
      </p>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      <span className="font-serif text-2xl text-foreground">{value}</span>
    </div>
  );
}
