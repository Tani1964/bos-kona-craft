import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { getOwnerContext, logoutOwner } from "@/lib/owner.functions";

export function OwnerChip() {
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getOwnerContext);
  const doLogout = useServerFn(logoutOwner);
  const { data } = useQuery({
    queryKey: ["ownerContext"],
    queryFn: () => fetchCtx(),
    refetchOnWindowFocus: true,
  });
  // Always-visible entry to the hub — signed in shows the masked phone,
  // signed out still gives a clear tap target to /me.
  if (!phone) {
    return (
      <Link
        to="/me"
        className="inline-flex items-center gap-1.5 rounded-full border border-bronze/30 bg-bronze/10 px-2.5 py-1 transition active:scale-95"
      >
        <User className="h-3 w-3 text-bronze" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
          Hub
        </span>
      </Link>
    );
  }
  const masked = phone.replace(/.(?=.{4})/g, "•");

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to="/me"
        className="inline-flex items-center gap-1.5 rounded-full border border-bronze/30 bg-bronze/10 px-2.5 py-1 transition active:scale-95"
      >
        <User className="h-3 w-3 text-bronze" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
          {masked}
        </span>
      </Link>
      <button
        onClick={async () => {
          await doLogout();
          await qc.invalidateQueries();
        }}
        aria-label="Sign out"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition active:scale-95"
      >
        <LogOut className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}
