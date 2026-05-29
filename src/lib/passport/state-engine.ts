// ─────────────────────────────────────────────────────────────────────────────
// Module 14 — State Engine
// Pure, deterministic functions that translate raw asset telemetry into the
// derived state the UI consumes (KFI score, lifecycle stage, recommendations).
// No React, no I/O — easily testable and runnable on server or client.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetTelemetry {
  /** Legacy/manual wear count (used as fallback when no wear_events exist) */
  wears: number;
  /** Manual care log entries (admin-set) — fallback only */
  careEntries: number;
  /** NFC authentication scans */
  nfcScans: number;
  /** Days since piece was issued */
  ageDays: number;
  /** Atelier-grade repairs performed */
  repairs: number;

  // ── Live signals (Phase 4 — wear_events + care_sessions) ──────
  /** Recorded wear sessions in the last 90 days */
  wearEvents?: number;
  /** Sum of effective_stress over recent wear_events (0..n) */
  effectiveStress?: number;
  /** Completed care sessions in the last 90 days */
  careSessions?: number;
  /** Days since the last completed care session (null = never) */
  daysSinceCare?: number | null;
  /** Days since the last wear session (null = never) */
  daysSinceWear?: number | null;
}

export type LifecycleStage =
  | "Pristine"
  | "Breaking In"
  | "Seasoned"
  | "Storied"
  | "Venerated";

export interface KfiBreakdown {
  base: number;
  wearImpact: number; // negative
  ageImpact: number; // negative
  stressImpact: number; // negative — environmental
  careImpact: number; // positive
  repairImpact: number; // positive
  nfcImpact: number; // positive (provenance trust)
  score: number; // 0-100
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

/** Heart of the engine — Kọ́nà Formula Index.
 *  When live signals exist (wearEvents / effectiveStress / careSessions) they
 *  take precedence over the manual legacy counters. */
export function computeKfi(t: AssetTelemetry): KfiBreakdown {
  const base = 100;

  // Wear: prefer real wear_events count, fall back to manual wears.
  const wearsForCalc =
    t.wearEvents && t.wearEvents > 0 ? t.wearEvents : t.wears;
  const wearImpact = -Math.min(wearsForCalc * 0.6, 30);

  // Environmental stress accumulated from wear_events (rain, transport, duration).
  const stress = t.effectiveStress ?? 0;
  const stressImpact = -Math.min(stress * 6, 25);

  const ageImpact = -Math.min((t.ageDays / 365) * 1.2, 15);

  // Care: prefer real care_sessions, fall back to manual careEntries.
  const careCount =
    t.careSessions && t.careSessions > 0 ? t.careSessions : t.careEntries;
  let careImpact = Math.min(careCount * 3, 25);
  // Penalise stale care if we know the last care date.
  if (t.daysSinceCare != null && t.daysSinceCare > 45) {
    careImpact = Math.max(0, careImpact - Math.min((t.daysSinceCare - 45) / 10, 10));
  }

  const repairImpact = Math.min(t.repairs * 4, 16);
  const nfcImpact = Math.min(t.nfcScans * 0.4, 8);

  const score = clamp(
    base +
      wearImpact +
      stressImpact +
      ageImpact +
      careImpact +
      repairImpact +
      nfcImpact,
  );

  return {
    base,
    wearImpact,
    stressImpact,
    ageImpact,
    careImpact,
    repairImpact,
    nfcImpact,
    score,
  };
}

export function deriveStage(score: number): LifecycleStage {
  if (score >= 95) return "Pristine";
  if (score >= 80) return "Breaking In";
  if (score >= 60) return "Seasoned";
  if (score >= 40) return "Storied";
  return "Venerated";
}

export function estimateLifespanYears(t: AssetTelemetry): number {
  const wearsForCalc =
    t.wearEvents && t.wearEvents > 0 ? t.wearEvents : t.wears;
  const yearsLived = Math.max(t.ageDays / 365, 0.1);
  const wearsPerYear = Math.max(wearsForCalc / yearsLived, 1);
  // Stress accelerates decay: each unit of stress ≈ 1.4x wear pressure.
  const stressMult = 1 + Math.min((t.effectiveStress ?? 0) * 0.05, 0.6);
  const remainingScore = computeKfi(t).score;
  return +(remainingScore / (wearsPerYear * 1.5 * stressMult)).toFixed(1);
}

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  urgency: "low" | "medium" | "high";
};

export function deriveRecommendation(t: AssetTelemetry): Recommendation {
  // Stale-care signal (live) takes priority.
  if (t.daysSinceCare != null && t.daysSinceCare > 45) {
    return {
      id: "condition",
      title: "Condition Leather",
      reason: `${t.daysSinceCare} days since last care session`,
      urgency: t.daysSinceCare > 75 ? "high" : "medium",
    };
  }
  // High accumulated stress → recommend rest & inspection.
  if ((t.effectiveStress ?? 0) > 3) {
    return {
      id: "rest-stress",
      title: "Rest & Air-Dry",
      reason: "Recent wear sessions exposed the piece to weather stress",
      urgency: "medium",
    };
  }
  // Legacy fallback when no live signals.
  const wearsForCalc =
    t.wearEvents && t.wearEvents > 0 ? t.wearEvents : t.wears;
  const careCount =
    t.careSessions && t.careSessions > 0 ? t.careSessions : t.careEntries;
  const wearsSinceCare = wearsForCalc - careCount * 5;
  if (wearsSinceCare > 12) {
    return {
      id: "condition",
      title: "Condition Leather",
      reason: "12+ wears since last conditioning",
      urgency: "high",
    };
  }
  if (t.ageDays > 180 && t.repairs === 0) {
    return {
      id: "inspect",
      title: "Atelier Inspection",
      reason: "First-year structural check recommended",
      urgency: "medium",
    };
  }
  return {
    id: "rest",
    title: "Rotate & Rest",
    reason: "Allow leather to recover",
    urgency: "low",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unlock predicates — pluggable rules consumed by the Ecosystem (Module 15).
// ─────────────────────────────────────────────────────────────────────────────

export type UnlockContext = {
  telemetry: AssetTelemetry;
  kfi: number;
  stage: LifecycleStage;
};

export type UnlockRule = (ctx: UnlockContext) => boolean;

export const UnlockRules = {
  always: (): UnlockRule => () => true,
  afterWears: (n: number): UnlockRule => (c) => c.telemetry.wears >= n,
  atStage: (stage: LifecycleStage): UnlockRule => (c) => c.stage === stage,
  kfiBelow: (n: number): UnlockRule => (c) => c.kfi < n,
  kfiAbove: (n: number): UnlockRule => (c) => c.kfi > n,
};

export function buildContext(t: AssetTelemetry): UnlockContext {
  const kfi = computeKfi(t).score;
  return { telemetry: t, kfi, stage: deriveStage(kfi) };
}
