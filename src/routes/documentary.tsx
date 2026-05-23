import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  Clock,
  MapPin,
  User,
} from "lucide-react";

export const Route = createFileRoute("/documentary")({
  component: Documentary,
  head: () => ({
    meta: [
      { title: "Origin · Documentary — Bos' Kọ́nà" },
      {
        name: "description",
        content:
          "A 12-minute documentary tracing the bespoke atelier behind the Air Formula F1.",
      },
    ],
  }),
});

const CHAPTERS = [
  { t: "00:00", title: "Prologue", note: "The atelier at dawn" },
  { t: "01:42", title: "The Hide", note: "Sourcing in Sokoto" },
  { t: "04:18", title: "The Cut", note: "Patternmaker's table" },
  { t: "07:05", title: "The Stitch", note: "Hand-welted construction" },
  { t: "10:21", title: "First Wear", note: "Owner unboxing in Lagos" },
];

function Documentary() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const progress = playing ? 34 : 0;

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-24">
        {/* Top nav */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Module · 08
          </span>
          <div className="h-9 w-9" />
        </motion.header>

        {/* Video player */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="px-5 pt-2"
        >
          <div className="relative aspect-[9/12] w-full overflow-hidden rounded-2xl border border-white/10">
            {/* Cinematic still */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.5_0.12_50),oklch(0.1_0.02_50))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,oklch(0.35_0.08_30)/0.6,transparent_60%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/10 to-stone-950/40" />

            {/* Film grain overlay accent */}
            <div className="absolute inset-0 grain opacity-60" />

            {/* Top film meta */}
            <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                <Film className="h-3 w-3 text-bronze" />
                <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-foreground">
                  Origin
                </span>
              </span>
              <span className="rounded-full border border-bronze/30 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-bronze backdrop-blur-sm">
                4K · Dolby
              </span>
            </div>

            {/* Center play button */}
            <button
              onClick={() => setPlaying((p) => !p)}
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bronze/40 bg-stone-950/60 backdrop-blur-md transition active:scale-95"
            >
              <div className="absolute inset-0 rounded-full border border-bronze/20 motion-safe:animate-ping" />
              {playing ? (
                <Pause className="h-7 w-7 text-bronze" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5 fill-bronze text-bronze" />
              )}
            </button>

            {/* Title block bottom */}
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
                Bespoke Atelier · Lagos
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-[1.05] tracking-tight text-foreground">
                Origin
              </h1>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                A 12 min film · Asset 8F92-A4B1
              </p>

              {/* Scrubber */}
              <div className="mt-4 space-y-2">
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-y-0 left-0 rounded-full bg-bronze"
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>{playing ? "04:07" : "00:00"}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMuted((m) => !m)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
                    >
                      {muted ? (
                        <VolumeX className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5 text-foreground" />
                      )}
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95">
                      <Maximize2 className="h-3.5 w-3.5 text-foreground" />
                    </button>
                  </div>
                  <span>12:00</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Meta strip */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-5 grid grid-cols-3 gap-2 px-5"
        >
          <MetaTile icon={<Clock className="h-3.5 w-3.5 text-bronze" />} label="Runtime" value="12:00" />
          <MetaTile icon={<MapPin className="h-3.5 w-3.5 text-bronze" />} label="Filmed" value="Lagos" />
          <MetaTile icon={<User className="h-3.5 w-3.5 text-bronze" />} label="Director" value="A. Okafor" />
        </motion.section>

        {/* Synopsis */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-6 px-5"
        >
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Synopsis
          </h2>
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-foreground/90">
            Filmed over fourteen days inside the Bos' Kọ́nà atelier, <span className="text-bronze">Origin</span> traces a single
            pair from raw hide to first step. A meditation on patience,
            inherited craft, and the quiet rituals that precede every wear.
          </p>
        </motion.section>

        {/* Chapters */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="mt-7 px-5"
        >
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Chapters
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {CHAPTERS.map((c, i) => (
              <button
                key={c.t}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition active:scale-[0.99] ${
                  i !== CHAPTERS.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
                  {c.t}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[15px] leading-tight text-foreground">
                    {c.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {c.note}
                  </p>
                </div>
                <Play className="h-3.5 w-3.5 shrink-0 fill-muted-foreground text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.section>

        {/* Credits */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-7 px-5"
        >
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Credits
            </h2>
            <div className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-[0.15em]">
              <CreditRow role="Director" name="Adaeze Okafor" />
              <CreditRow role="Cinematography" name="K. Bamidele" />
              <CreditRow role="Score" name="Ibeyi · original cue" />
              <CreditRow role="Atelier" name="Bos' Kọ́nà, Lagos" />
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60">
            © Bos' Kọ́nà · Passport Edition
          </p>
        </motion.section>
      </main>
    </div>
  );
}

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="font-serif text-sm text-foreground">{value}</span>
    </div>
  );
}

function CreditRow({ role, name }: { role: string; name: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{role}</span>
      <span className="text-foreground">{name}</span>
    </div>
  );
}
