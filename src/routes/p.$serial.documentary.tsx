import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
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
import { passportQueryOptions } from "@/lib/passport/queries";

export const Route = createFileRoute("/p/$serial/documentary")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(passportQueryOptions(params.serial)),
  component: Documentary,
  head: ({ params }) => ({
    meta: [
      { title: `Origin · Documentary · ${params.serial} — Bos' Kọ́nà` },
      {
        name: "description",
        content:
          "A documentary tracing the bespoke atelier behind this passport.",
      },
    ],
  }),
});

function Documentary() {
  const { serial: serialParam } = Route.useParams();
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serialParam));
  const doc = (passport?.documentary as any) ?? {};
  const videoUrl = (passport as any)?.video_url as string | null;
  const serial = passport?.serial ?? serialParam;

  const chapters: { t: string; time: string }[] = Array.isArray(doc.chapters) ? doc.chapters : [];
  const credits: { role: string; name: string }[] = Array.isArray(doc.credits) ? doc.credits : [];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) {
      setPlaying((p) => !p);
      return;
    }
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    setMuted((m) => {
      const next = !m;
      if (v) v.muted = next;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="relative mx-auto h-screen max-w-md overflow-y-auto overflow-x-hidden pb-24">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="sticky top-0 z-30 flex items-center justify-between bg-stone-950/80 px-5 pt-6 pb-3 backdrop-blur-md"
        >
          <Link
            to="/p/$serial"
            params={{ serial: serialParam }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Module · 08
          </span>
          <div className="h-9 w-9" />
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="px-5 pt-2"
        >
          <div className="relative aspect-[9/12] w-full overflow-hidden rounded-2xl border border-white/10 bg-stone-950">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="absolute inset-0 h-full w-full object-cover"
                muted={muted}
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.5_0.12_50),oklch(0.1_0.02_50))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,oklch(0.35_0.08_30)/0.6,transparent_60%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/10 to-stone-950/40" />
                <div className="absolute inset-0 grain opacity-60" />
              </>
            )}

            <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                <Film className="h-3 w-3 text-bronze" />
                <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-foreground">
                  Origin
                </span>
              </span>
              <span className="rounded-full border border-bronze/30 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-bronze backdrop-blur-sm">
                {doc.format || "4K · Dolby"}
              </span>
            </div>

            <button
              onClick={togglePlay}
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bronze/40 bg-stone-950/60 backdrop-blur-md transition active:scale-95"
            >
              {!playing && (
                <div className="absolute inset-0 rounded-full border border-bronze/20 motion-safe:animate-ping" />
              )}
              {playing ? (
                <Pause className="h-7 w-7 text-bronze" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5 fill-bronze text-bronze" />
              )}
            </button>

            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
                Bespoke Atelier
              </p>
              <h1 className="mt-1 font-serif text-3xl leading-[1.05] tracking-tight text-foreground">
                {doc.title || "Origin"}
              </h1>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {doc.runtime || "—"} · Asset {serial}
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={toggleMute}
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
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-5 grid grid-cols-3 gap-2 px-5"
        >
          <MetaTile icon={<Clock className="h-3.5 w-3.5 text-bronze" />} label="Runtime" value={doc.runtime || "—"} />
          <MetaTile icon={<MapPin className="h-3.5 w-3.5 text-bronze" />} label="Year" value={doc.year || "—"} />
          <MetaTile icon={<User className="h-3.5 w-3.5 text-bronze" />} label="Format" value={doc.format || "—"} />
        </motion.section>

        {doc.synopsis ? (
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
              {doc.synopsis}
            </p>
          </motion.section>
        ) : null}

        {chapters.length > 0 && (
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
              {chapters.map((c, i) => (
                <button
                  key={`${c.time}-${i}`}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition active:scale-[0.99] ${
                    i !== chapters.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
                    {c.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[15px] leading-tight text-foreground">
                      {c.t}
                    </p>
                  </div>
                  <Play className="h-3.5 w-3.5 shrink-0 fill-muted-foreground text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {credits.length > 0 && (
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
                {credits.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{c.role}</span>
                    <span className="text-foreground">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60">
              © Bos' Kọ́nà · Passport Edition
            </p>
          </motion.section>
        )}
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
