import { createFileRoute, redirect } from "@tanstack/react-router";
import { getOwnerContext, listMyAssets } from "@/lib/owner.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // SSR has no session — defer to client-side run.
    if (import.meta.env.SSR) return;
    try {
      const ctx = await getOwnerContext();
      if (!ctx?.phone) {
        throw redirect({ to: "/claim" });
      }
      const { assets } = await listMyAssets();
      if (assets.length === 1) {
        const serial = (assets[0] as any).assets?.serial;
        if (serial) throw redirect({ to: "/p/$serial", params: { serial } });
      }
      throw redirect({ to: "/me" });
    } catch (e: any) {
      // Re-throw redirects; swallow other errors and fall back to /me.
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
      throw redirect({ to: "/me" });
    }
  },
  component: () => null,
});
