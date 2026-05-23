import { queryOptions } from "@tanstack/react-query";
import { getPassport } from "@/lib/passport.functions";

export const DEFAULT_SERIAL = "8F92-A4B1";

export const passportQueryOptions = (serial: string) =>
  queryOptions({
    queryKey: ["passport", serial],
    queryFn: () => getPassport({ data: { serial } }),
  });

// Map provenance.icon_key (admin-set string) to a lucide icon component name.
// Components import lucide icons directly; this just normalizes the key.
export type PassportData = Awaited<ReturnType<typeof getPassport>>;
