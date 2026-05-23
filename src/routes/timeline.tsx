import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Footprints,
  Shield,
  Sparkles,
  ScanLine,
  MapPin,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/timeline")({
  component: TimelinePage,
  head: () => ({
    meta: [
      { title: "Ownership Timeline · Bos' Kọ́nà" },
      {
        name: "description",
        content: "Full wear, care and provenance timeline for this asset.",
      },
    ],
  }),
});

type EventType = "wear" | "care" | "nfc" | "origin";

interface TLEvent {
  type: EventType;
  date: string;
  title: string;
  meta: string;
  location?: string;
}

const events: TLEvent[] = [
  { type: "wear", date: "May 22, 2026", title: "Wear #30 — Out the Door", meta: "4.2 hrs · Light rain", location: "Lagos, NG" },
  { type: "care", date: "May 18, 2026", title: "Leather Polish", meta: "Manual log · Bronze Kit" },
  { type: "nfc", date: "May 18, 2026", title: "NFC Care Kit Scan", meta: "Authenticated · +1.2 KFI" },
  { type: "wear", date: "May 14, 2026", title: "Wear #29", meta: "6.1 hrs · Dry", location: "Lagos, NG" },
  { type: "wear", date: "May 09, 2026", title: "Wear #28", meta: "3.4 hrs · Dry" },
  { type: "care", date: "May 02, 2026", title: "Surface Clean", meta: "Manual log" },
  { type: "wear", date: "Apr 27, 2026", title: "Wear #27", meta: "8.0 hrs · Humid", location: "Accra, GH" },
  { type: "wear", date: "Apr 21, 2026", title: "Wear #26", meta: "2.5 hrs · Dry" },
  { type: "care", date: "Apr 14, 2026", title: "Sole Maintenance", meta: "Atelier verified" },
  { type: "wear", date: "Apr 09, 2026", title: "Wear #25", meta: "5.0 hrs · Dry" },
  { type: "origin", date: "Jan 12, 2026", title: "Issued to Owner", meta: "Bespoke Atelier · Asset 8F92-A4B1", location: "Lagos Atelier" },
];

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  };
}

function TimelinePage() {
  const wears = events.filter((e) => e.type === "wear").length;
  const cares = events.filter((e) => e.type === "care").length;
  const scans = events.filter((e) => e.type === "nfc").length;

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-16">
        {/* Top nav */}
        <motion.header
          {...fade(0)}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Module · 06
          </span>
          <div className="h-9 w-9" />
        </motion.header>

        {/* Title */}
        <section className="px-5 pt-3">
          <motion.p
            {...fade(0.05)}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze"
          >
            Ownership Timeline
          </motion.p>
          <motion.h1
            {...fade(0.1)}
            className="mt-2 font-serif text-3xl leading-[1.05] tracking-tight"
          >
            Every wear, every<br />ritual, recorded.
          </motion.h1>
          <motion.p
            {...fade(0.18)}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            Asset // 8F92-A4B1
          </motion.p>
        </section>

        {/* Summary */}
        <motion.div
          {...fade(0.25)}
          className="mx-5 mt-6 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <Stat label="Wears" value={String(wears)} />
          <Stat label="Care" value={String(cares)} />
          <Stat label="NFC" value={String(scans)} />
        </motion.div>

        {/* Timeline */}
        <section className="relative mt-8 px-5">
          <motion.h2
            {...fade(0.32)}
            className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            Recent Activity
          </motion.h2>

          {/* Vertical rail */}
          <div className="relative pl-7">
            <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-bronze/40 via-white/10 to-transparent" />

            {events.map((e, i) => (
              <TimelineRow key={i} event={e} index={i} />
            ))}
          </div>

          <motion.p
            {...fade(0.4)}
            className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            ── End of ledger ──
          </motion.p>
        </section>
      </main>
    </div>
  );
}

const ICONS: Record<EventType, ReactNode> = {
  wear: <Footprints className="h-3.5 w-3.5" />,
  care: <Shield className="h-3.5 w-3.5" />,
  nfc: <ScanLine className="h-3.5 w-3.5" />,
  origin: <Sparkles className="h-3.5 w-3.5" />,
};

const TONE: Record<EventType, string> = {
  wear: "border-white/15 bg-stone-900 text-foreground",
  care: "border-verified/40 bg-verified/10 text-verified",
  nfc: "border-bronze/50 bg-bronze/10 text-bronze",
  origin: "border-bronze/60 bg-bronze text-stone-950",
};

function TimelineRow({ event, index }: { event: TLEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 + index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-5"
    >
      <div
        className={`absolute -left-7 top-1 flex h-6 w-6 items-center justify-center rounded-full border ${TONE[event.type]}`}
      >
        {ICONS[event.type]}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {event.date}
      </p>
      <h3 className="mt-1 font-serif text-lg leading-tight text-foreground">
        {event.title}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{event.meta}</p>
      {event.location && (
        <p className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-bronze/80">
          <MapPin className="h-3 w-3" />
          {event.location}
        </p>
      )}
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
