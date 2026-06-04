// ─────────────────────────────────────────────────────────────────────────────
// Module 15 — Ecosystem Registry
// The canonical list of passport modules. Each entry declares its unlock rule
// and the route it deep-links to. The feed renderer consults this registry to
// decide what to show and what to lock — no per-card conditionals in the UI.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Clock,
  Hammer,
  Film,
  Archive,
  Sparkles,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import {
  UnlockRules,
  buildContext,
  type AssetTelemetry,
  type UnlockContext,
  type UnlockRule,
} from "./state-engine";

export type ThumbnailStyle =
  | { kind: "gradient"; from: string; via?: string; to: string }
  | { kind: "radial"; spec: string }
  | { kind: "none" };

export interface EcosystemModule {
  id: string;
  /** Module ordinal (1-13 in the master system) */
  ordinal: number;
  title: string;
  subtitle: (ctx: UnlockContext) => string;
  to?: string;
  icon: LucideIcon;
  thumbnail?: ThumbnailStyle;
  video?: boolean;
  unlock: UnlockRule;
  /** When locked, what to display instead of the dynamic subtitle */
  lockedHint: string;
}

export const ECOSYSTEM: EcosystemModule[] = [
  {
    id: "timeline",
    ordinal: 6,
    title: "Ownership Timeline",
    subtitle: (c) => `${c.telemetry.wears} Wears Logged`,
    to: "/timeline",
    icon: Clock,
    thumbnail: { kind: "gradient", from: "from-leather", via: "via-terracotta", to: "to-stone-900" },
    unlock: UnlockRules.always(),
    lockedHint: "",
  },
  {
    id: "ownership",
    ordinal: 11,
    title: "Chain of Ownership",
    subtitle: () => "Provenance of acquisition",
    to: "/ownership",
    icon: ScrollText,
    unlock: UnlockRules.always(),
    lockedHint: "",
  },

  {
    id: "provenance",
    ordinal: 7,
    title: "Craft Provenance",
    subtitle: () => "Material & Design Journey",
    to: "/provenance",
    icon: Hammer,
    unlock: UnlockRules.always(),
    lockedHint: "",
  },
  {
    id: "doc-origin",
    ordinal: 8,
    title: "Documentary: Origin",
    subtitle: () => "12 min · Bespoke Atelier",
    to: "/documentary",
    icon: Film,
    thumbnail: { kind: "radial", spec: "circle_at_30%_30%,oklch(0.45_0.1_50),oklch(0.12_0.01_50)" },
    video: true,
    unlock: UnlockRules.always(),
    lockedHint: "",
  },
  {
    id: "doc-transform",
    ordinal: 9,
    title: "Documentary: Transformation",
    subtitle: () => "Premiering on your wear journey",
    icon: Film,
    thumbnail: { kind: "radial", spec: "circle_at_70%_60%,oklch(0.32_0.08_30),oklch(0.1_0.01_30))" },
    video: true,
    unlock: UnlockRules.afterWears(50),
    lockedHint: "Unlocks at 50 Wears",
  },
  {
    id: "archive",
    ordinal: 13,
    title: "Archive Collection Access",
    subtitle: () => "Members-only vault",
    icon: Archive,
    unlock: UnlockRules.atStage("Venerated"),
    lockedHint: "Unlocks at Venerated Stage (KFI < 40)",
  },
  {
    id: "heirloom",
    ordinal: 12,
    title: "Heirloom Transfer",
    subtitle: () => "Bequest & resale ledger",
    icon: Sparkles,
    unlock: UnlockRules.kfiBelow(60),
    lockedHint: "Unlocks once piece reaches Seasoned",
  },
];

export interface ResolvedModule extends EcosystemModule {
  locked: boolean;
  resolvedSubtitle: string;
}

/** Single entry-point the UI calls each render. */
export function resolveFeed(
  telemetry: AssetTelemetry,
  serial?: string,
): ResolvedModule[] {
  const ctx = buildContext(telemetry);
  return ECOSYSTEM.map((m) => {
    const locked = !m.unlock(ctx);
    const to =
      m.to && serial ? `/p/${encodeURIComponent(serial)}${m.to}` : m.to;
    return {
      ...m,
      to,
      locked,
      resolvedSubtitle: locked ? m.lockedHint : m.subtitle(ctx),
    };
  });
}
