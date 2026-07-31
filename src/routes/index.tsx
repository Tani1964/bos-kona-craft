import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getOwnerContext, listMyAssets } from "@/lib/owner.functions";
import { DEFAULT_SERIAL } from "@/lib/passport/queries";
import { markPassportClaimed } from "@/pwa/installState";

export const Route = createFileRoute("/")({
  component: EntryResolver,
  head: () => ({
    meta: [
      { title: "Craft Passport — Bos' Kọ́nà" },
      {
        name: "description",
        content:
          "Open your Bos' Kọ́nà craft passport: KFI score, wear history, care intelligence and provenance.",
      },
      { property: "og:title", content: "Craft Passport — Bos' Kọ́nà" },
      {
        property: "og:description",
        content:
          "Open your Bos' Kọ́nà craft passport: KFI score, wear history, care intelligence and provenance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function EntryResolver() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await getOwnerContext();
        if (cancelled) return;
        if (!ctx?.phone) {
          navigate({ to: "/p/$serial", params: { serial: DEFAULT_SERIAL } });
          return;
        }
        markPassportClaimed();
        const { assets } = await listMyAssets();
        if (cancelled) return;
        const serial = (assets?.[0] as any)?.assets?.serial;
        if (assets?.length === 1 && serial) {
          navigate({ to: "/p/$serial", params: { serial } });
          return;
        }
        navigate({ to: "/me" });
      } catch {
        if (!cancelled) {
          navigate({ to: "/p/$serial", params: { serial: DEFAULT_SERIAL } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 text-foreground grain">
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        Opening passport…
      </span>
    </div>
  );
}
