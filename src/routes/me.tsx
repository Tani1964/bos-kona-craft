import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { listMyAssets, logoutOwner } from "@/lib/owner.functions";
import { PendingWearPrompt } from "@/components/passport/PendingWearPrompt";
import { WearSettings } from "@/components/passport/WearSettings";
import { MyMessages } from "@/components/passport/MyMessages";

export const Route = createFileRoute("/me")({
  component: MePage,
  head: () => ({ meta: [{ title: "My passports — Bos' Kọ́nà" }] }),
});

function MePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyAssets);
  const doLogout = useServerFn(logoutOwner);
  const { data, isLoading } = useQuery({
    queryKey: ["myAssets"],
    queryFn: () => fetchList(),
  });

  const phone = data?.phone ?? null;
  const assets = data?.assets ?? [];

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain">
      <main className="mx-auto max-w-md px-5 pt-8 pb-16">
        <header className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em]">
            Bos' Kọ́nà
          </span>
          {phone && (
            <button
              onClick={async () => {
                await doLogout();
                await qc.invalidateQueries();
                navigate({ to: "/claim" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 active:scale-95"
            >
              <LogOut className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Sign out
              </span>
            </button>
          )}
        </header>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 font-serif text-3xl"
        >
          My passports
        </motion.h1>
        {phone && (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Signed in as {phone}
          </p>
        )}

        <div className="-mx-5">
          <PendingWearPrompt />
        </div>

        <section className="mt-6 space-y-2">
          {isLoading && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground">
              Loading…
            </div>
          )}

          {!isLoading && !phone && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-muted-foreground">
                You're not signed in. Open a passport with your phone number to
                see all your pieces here.
              </p>
              <Link
                to="/claim"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-bronze px-4 text-sm font-bold text-stone-950"
              >
                Open a passport
              </Link>
            </div>
          )}

          {!isLoading && phone && assets.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground">
              No passports linked to this number yet.
            </div>
          )}

          {assets.map((row: any) => {
            const a = row.assets ?? {};
            return (
              <Link
                key={row.asset_id}
                to="/p/$serial"
                params={{ serial: a.serial }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition active:scale-[0.99]"
              >
                <div>
                  <div className="font-serif text-lg leading-tight">
                    {a.model_name ?? "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {a.serial} · {a.status ?? "New"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}

          {phone && (
            <Link
              to="/claim"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              Link another passport
            </Link>
          )}
        </section>

        {phone && <WearSettings />}
      </main>
    </div>
  );
}
