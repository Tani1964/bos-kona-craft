import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Film,
  Clock,
  MapPin,
  User,
  ExternalLink,
} from "lucide-react";
import { passportQueryOptions } from "@/lib/passport/queries";
import { markFilmWatched } from "@/lib/passport/watched";

export const Route = createFileRoute("/p/$serial/documentary")({
  validateSearch: (search: Record<string, unknown>) => ({
    film: search.film === "transform" ? ("transform" as const) : ("origin" as const),
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(passportQueryOptions(params.serial)),
  component: Documentary,
  head: ({ params }) => ({
    meta: [
      { title: `Film · ${params.serial} — Bos' Kọ́nà` },
      {
        name: "description",
        content:
          "A short film tracing the atelier and the transformation behind this passport.",
      },
    ],
  }),
});

function Documentary() {
  const { serial: serialParam } = Route.useParams();
  const { film } = Route.useSearch();
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serialParam));
  const doc = (passport?.documentary as any) ?? {};
  const serial = passport?.serial ?? serialParam;

  const filmUrl =
    (film === "transform"
      ? (passport as any)?.film_transform_url
      : (passport as any)?.film_origin_url) ?? null;

  const label = film === "transform" ? "Transformation" : "Origin";
  const chapters: { t: string; time: string }[] = Array.isArray(doc.chapters) ? doc.chapters : [];
  const credits: { role: string; name: string }[] = Array.isArray(doc.credits) ? doc.credits : [];

  const openFilm = () => {
    if (!filmUrl) return;
    markFilmWatched(serial, film);
    window.open(filmUrl, "_blank", "noopener,noreferrer");
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
            Screening
          </span>
          <div className="h-9 w-9" />
        </motion.header>

        {!filmUrl ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="px-5 pt-10 text-center"
          >
            <Film className="mx-auto h-6 w-6 text-bronze/60" />
            <h1 className="mt-4 font-serif text-2xl leading-tight text-foreground">
              No film screening
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Films appear here only while they're released
            </p>
            <Link
              to="/p/$serial"
              params={{ serial: serialParam }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground transition active:scale-95"
            >
              Back to passport
            </Link>
          </motion.section>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="px-5 pt-2"
            >
              <div className="relative aspect-[9/12] w-full overflow-hidden rounded-2xl border border-white/10 bg-stone-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.5_0.12_50),oklch(0.1_0.02_50))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,oklch(0.35_0.08_30)/0.6,transparent_60%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/10 to-stone-950/40" />
                <div className="absolute inset-0 grain opacity-60" />

                <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                    <Film className="h-3 w-3 text-bronze" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-foreground">
                      {label}
                    </span>
                  </span>
                  <span className="rounded-full border border-bronze/30 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-bronze backdrop-blur-sm">
                    {doc.format || "Limited screening"}
                  </span>
                </div>

                <button
                  onClick={openFilm}
                  aria-label={`Watch ${label}`}
                  className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bronze/40 bg-stone-950/60 backdrop-blur-md transition active:scale-95"
                >
                  <div className="absolute inset-0 rounded-full border border-bronze/20 motion-safe:animate-ping" />
                  <Play className="h-7 w-7 translate-x-0.5 fill-bronze text-bronze" />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
                    Bespoke Atelier
                  </p>
                  <h1 className="mt-1 font-serif text-3xl leading-[1.05] tracking-tight text-foreground">
                    {doc.title || label}
                  </h1>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {doc.runtime || "—"} · Asset {serial}
                  </p>
                </div>
              </div>

              <button
                onClick={openFilm}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-bronze/40 bg-bronze/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-bronze transition active:scale-[0.99]"
              >
                Watch the film <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70">
                One-off screening · retires after viewing
              </p>
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
                    <div
                      key={`${c.time}-${i}`}
                      className={`flex w-full items-center gap-4 px-4 py-3 text-left ${
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
                    </div>
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
          </>
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
