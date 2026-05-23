// ─────────────────────────────────────────────────────────────────────────────
// Module 14 — State Engine
// Pure, deterministic functions that translate raw asset telemetry into the
// derived state the UI consumes (KFI score, lifecycle stage, recommendations).
// No React, no I/O — easily testable and runnable on server or client.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetTelemetry {
  /** Total recorded wears */
  wears: number;
  /** Care log entries (condition, polish, repair, …) */
  careEntries: number;
  /** NFC authentication scans */
  nfcScans: number;
  /** Days since piece was issued */
  ageDays: number;
  /** Atelier-grade repairs performed */
  repairs: number;
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
  careImpact: number; // positive
  repairImpact: number; // positive
  nfcImpact: number; // positive (provenance trust)
  score: number; // 0-100
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

/** Heart of the engine — Kọ́nà Formula Index. */
export function computeKfi(t: AssetTelemetry): KfiBreakdown {
  const base = 100;
  const wearImpact = -Math.min(t.wears * 0.5, 40);
  const ageImpact = -Math.min((t.ageDays / 365) * 1.2, 18);
  const careImpact = Math.min(t.careEntries * 2.5, 25);
  const repairImpact = Math.min(t.repairs * 4, 16);
  const nfcImpact = Math.min(t.nfcScans * 0.4, 8);

  const score = clamp(
    base + wearImpact + ageImpact + careImpact + repairImpact + nfcImpact,
  );

  return { base, wearImpact, ageImpact, careImpact, repairImpact, nfcImpact, score };
}

export function deriveStage(score: number): LifecycleStage {
  if (score >= 95) return "Pristine";
  if (score >= 80) return "Breaking In";
  if (score >= 60) return "Seasoned";
  if (score >= 40) return "Storied";
  return "Venerated";
}

export function estimateLifespanYears(t: AssetTelemetry): number {
  const wearsPerYear = Math.max(t.wears / Math.max(t.ageDays / 365, 0.1), 1);
  const remainingScore = computeKfi(t).score;
  return +(remainingScore / (wearsPerYear * 1.5)).toFixed(1);
}

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  urgency: "low" | "medium" | "high";
};

export function deriveRecommendation(t: AssetTelemetry): Recommendation {
  const wearsSinceCare = t.wears - t.careEntries * 5;
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
