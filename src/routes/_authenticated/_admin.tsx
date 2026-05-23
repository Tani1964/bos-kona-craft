import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { claimAdminIfNone, isCurrentUserAdmin } from "@/lib/passport.functions";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    // First user can claim admin if none exists yet — bootstrap convenience.
    await claimAdminIfNone().catch(() => {});
    const { admin } = await isCurrentUserAdmin();
    if (!admin) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
