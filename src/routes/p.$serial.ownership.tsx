import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText, ShoppingBag, ExternalLink } from "lucide-react";
import { passportQueryOptions } from "@/lib/passport/queries";
import { productUrl } from "@/lib/storefront/boskona";

export const Route = createFileRoute("/p/$serial/ownership")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(passportQueryOptions(params.serial)),
  component: OwnershipPage,
  head: ({ params }) => ({
    meta: [
      { title: `Chain of Ownership · ${params.serial} — Bos' Kọ́nà` },
      {
        name: "description",
        content:
          "Provenance of acquisition: the full ownership ledger for this craft passport.",
      },
    ],
  }),
});

type OwnershipRecord = {
  id: string;
  store_order_id: string | null;
  owner_ref: string | null;
  event_type: string;
  acquired_at: string;
  notes: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  purchase: "Purchase",
  transfer: "Transfer",
  resale: "Resale",
  gift: "Gift",
};

function OwnershipPage() {
  const { serial } = Route.useParams();
  const { data: passport } = useSuspenseQuery(passportQueryOptions(serial));
  const records = ((passport as any)?.ownership_records ?? []) as OwnershipRecord[];

  const storeProductId = (passport as any)?.store_product_id as string | null | undefined;

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="mx-auto max-w-md px-5 pt-6 pb-24">
        <Link
          to="/p/$serial"
          params={{ serial }}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Passport
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-bronze" />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
              Module 11 · Provenance
            </p>
          </div>
          <h1 className="mt-2 font-serif text-4xl leading-[1.05] tracking-tight">
            Chain of <span className="text-bronze">Ownership</span>
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {passport?.model_name} · {passport?.serial}
          </p>
        </motion.header>

        {storeProductId && (
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            href={productUrl(storeProductId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-between rounded-xl border border-bronze/30 bg-gradient-to-br from-bronze/10 to-transparent p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bronze/15">
                <ShoppingBag className="h-4 w-4 text-bronze" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                  Identity Anchor
                </p>
                <p className="mt-0.5 font-serif text-sm">{storeProductId}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-bronze" />
          </motion.a>
        )}

        <section className="mt-8">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Acquisition Ledger
          </p>

          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                No ownership records yet
              </p>
              <p className="mt-2 font-serif text-sm text-muted-foreground/70">
                Records appear automatically the moment a purchase is recorded
                at Bos' Kọ́nà.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-4 border-l border-white/10 pl-5">
              {records.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="relative"
                >
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-bronze ring-4 ring-stone-950" />
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bronze">
                          {EVENT_LABEL[r.event_type] ?? r.event_type}
                        </p>
                        <p className="mt-1 font-serif text-lg leading-tight">
                          {r.owner_ref ?? "Anonymous Owner"}
                        </p>
                      </div>
                      <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {new Date(r.acquired_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </p>
                    </div>
                    {r.store_order_id && (
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Order // <span className="text-foreground">{r.store_order_id}</span>
                      </p>
                    )}
                    {r.notes && (
                      <p className="mt-2 font-serif text-sm text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
