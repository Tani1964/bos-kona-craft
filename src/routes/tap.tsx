import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Radio } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { listMyAssets } from "@/lib/owner.functions";
import { recordCareTap } from "@/lib/owner.functions";

const searchSchema = z.object({
  tool: z.string().min(1).max(64),
  serial: z.string().optional(),
});

export const Route = createFileRoute("/tap")({
  validateSearch: (s) => searchSchema.parse(s),
  component: TapPage,
  head: () => ({
    meta: [
      { title: "Care tap logged — Bos' Kọ́nà Craft Passport" },
      {
        name: "description",
        content:
          "Your Bos' Kọ́nà care tool tap is recorded against your passport's maintenance history.",
      },
      { property: "og:title", content: "Care tap — Bos' Kọ́nà Craft Passport" },
      {
        property: "og:description",
        content: "Authentic care, recorded on your passport.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TapPage() {
  const { tool, serial } = Route.useSearch();
  const navigate = useNavigate();
  const fetchAssets = useServerFn(listMyAssets);
  const tap = useServerFn(recordCareTap);
  const fired = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-assets"],
    queryFn: () => fetchAssets(),
  });

  const mutation = useMutation({
    mutationFn: (input: { tool_id: string; serial?: string }) =>
      tap({ data: input }),
  });

  const assets = data?.assets ?? [];
  const signedIn = !!data?.phone;

  useEffect(() => {
    if (isLoading || fired.current) return;
    if (!signedIn) {
      navigate({ to: "/claim", search: { serial: serial ?? undefined } });
      return;
    }
    const target = serial ?? (assets.length === 1 ? assets[0].assets?.serial : undefined);
    if (target) {
      fired.current = true;
      mutation.mutate({ tool_id: tool, serial: target });
    }
  }, [isLoading, signedIn, assets.length, serial, tool]);

  return (
    <div className="grain flex min-h-screen items-center justify-center bg-stone-950 px-5 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-bronze/30 bg-bronze/10">
          {mutation.isSuccess ? (
            <Check className="h-5 w-5 text-bronze" />
          ) : (
            <Radio className="h-5 w-5 text-bronze" />
          )}
        </div>

        <h1 className="mt-4 font-serif text-3xl leading-tight">
          {mutation.isSuccess ? "Care logged" : "Care tool detected"}
        </h1>

        {mutation.isSuccess && (
          <>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {mutation.data.tool_name} ·{" "}
              {mutation.data.classification ?? "Session in progress"}
            </p>
            <Link
              to="/p/$serial"
              params={{ serial: mutation.data.serial }}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-bronze font-bold text-stone-950"
            >
              Back to passport
            </Link>
          </>
        )}

        {mutation.isError && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-destructive">
            {(mutation.error as Error).message}
          </p>
        )}

        {!mutation.isSuccess && !mutation.isError && (
          <>
            {isLoading || mutation.isPending ? (
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Recording…
              </p>
            ) : (
              signedIn &&
              !serial &&
              assets.length !== 1 && (
                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Which piece are you caring for?
                  </p>
                  <div className="mt-3 space-y-2">
                    {assets.map((a: any) => (
                      <button
                        key={a.asset_id}
                        onClick={() => {
                          fired.current = true;
                          mutation.mutate({ tool_id: tool, serial: a.assets?.serial });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-3 text-left text-sm"
                      >
                        {a.assets?.model_name ?? a.assets?.serial}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
