// ─────────────────────────────────────────────────────────────────────────────
// KFI v2 — Kọ́nà Formula Index
// Pure compute. Blends four components into a 0-100 score with a trend signal.
//
//   1. Maintenance Consistency — how regular the care log is.
//   2. Care Responsiveness     — how quickly care follows high-stress wear.
//   3. Environmental Load      — cumulative weather + transport stress (inverse).
//   4. Cadence Health          — wear frequency relative to a healthy band.
//
// No I/O. Safe to run on server or client. Server fn `getKfi` in
// passport.functions.ts aggregates the inputs and calls computeKfiV2 twice
// (current window + previous window) to derive `trend`.
// ─────────────────────────────────────────────────────────────────────────────

export interface WearSample {
  started_at: string;
  ended_at?: string | null;
  effective_stress?: number | null;
}

export interface CareSample {
  /** Treat `ended_at` (or `started_at` when no end) as completion time. */
  started_at: string;
  ended_at?: string | null;
  status?: string | null;
}

export interface KfiInput {
  wears: WearSample[];
  cares: CareSample[];
  ageDays: number;
  repairs: number;
  nfcScans: number;
  /** Window length in days for normalisation (default 90). */
  windowDays?: number;
  /** Optional "now" for deterministic testing. */
  now?: number;
}

export interface KfiComponent {
  /** 0-100, higher is better. */
  score: number;
  /** Weight contribution to final score (0-1). */
  weight: number;
  /** Human-readable one-liner explaining the score. */
  note: string;
}

export interface KfiResult {
  score: number;
  components: {
    maintenanceConsistency: KfiComponent;
    careResponsiveness: KfiComponent;
    environmentalLoad: KfiComponent;
    cadenceHealth: KfiComponent;
  };
  /** Small adjustments (repairs, NFC) layered on top, capped. */
  bonuses: { repairs: number; nfc: number };
  trend: {
    direction: "up" | "flat" | "down";
    delta: number; // current - previous (score points)
    previous: number; // previous-window score (0-100)
  };
}

const WEIGHTS = {
  maintenanceConsistency: 0.25,
  careResponsiveness: 0.25,
  environmentalLoad: 0.3,
  cadenceHealth: 0.2,
} as const;

const HEALTHY_CARE_GAP_DAYS = 30;
const STALE_CARE_GAP_DAYS = 90;
const RESPONSIVE_WINDOW_DAYS = 7;
const HIGH_STRESS_THRESHOLD = 0.6;
const HEALTHY_WEARS_PER_WEEK = { low: 1, high: 4 };

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

function completedCares(cares: CareSample[]) {
  return cares
    .filter((c) => c.status === "complete" || c.ended_at)
    .map((c) => new Date(c.ended_at ?? c.started_at).getTime())
    .sort((a, b) => a - b);
}

function maintenanceConsistency(
  cares: CareSample[],
  windowDays: number,
  now: number,
): KfiComponent {
  const times = completedCares(cares);
  if (times.length === 0) {
    return {
      score: 0,
      weight: WEIGHTS.maintenanceConsistency,
      note: "No care logged in this window",
    };
  }
  // Build gap series including window boundaries so a single recent care
  // does not score 100 just because there are no internal gaps to measure.
  const windowStart = now - windowDays * 86400000;
  const boundedTimes = [windowStart, ...times, now];
  const gapsDays: number[] = [];
  for (let i = 1; i < boundedTimes.length; i++) {
    gapsDays.push((boundedTimes[i] - boundedTimes[i - 1]) / 86400000);
  }
  const mean = gapsDays.reduce((a, b) => a + b, 0) / gapsDays.length;
  // Linear: ≤30d gap = 100, ≥90d = 0.
  const rawScore =
    100 * (1 - (mean - HEALTHY_CARE_GAP_DAYS) /
      (STALE_CARE_GAP_DAYS - HEALTHY_CARE_GAP_DAYS));
  const score = clamp(rawScore);
  return {
    score,
    weight: WEIGHTS.maintenanceConsistency,
    note: `Avg gap ${Math.round(mean)}d between care sessions`,
  };
}

function careResponsiveness(
  wears: WearSample[],
  cares: CareSample[],
): KfiComponent {
  const stressedWears = wears
    .filter((w) => (w.effective_stress ?? 0) >= HIGH_STRESS_THRESHOLD)
    .map((w) => new Date(w.ended_at ?? w.started_at).getTime());

  if (stressedWears.length === 0) {
    return {
      score: 100,
      weight: WEIGHTS.careResponsiveness,
      note: "No high-stress wears to respond to",
    };
  }

  const careTimes = completedCares(cares);
  const responded = stressedWears.filter((wt) =>
    careTimes.some(
      (ct) =>
        ct >= wt && ct - wt <= RESPONSIVE_WINDOW_DAYS * 86400000,
    ),
  ).length;

  const ratio = responded / stressedWears.length;
  return {
    score: clamp(ratio * 100),
    weight: WEIGHTS.careResponsiveness,
    note: `${responded}/${stressedWears.length} stressed wears followed by care within ${RESPONSIVE_WINDOW_DAYS}d`,
  };
}

function environmentalLoad(
  wears: WearSample[],
  windowDays: number,
): KfiComponent {
  const totalStress = wears.reduce(
    (s, w) => s + (Number(w.effective_stress) || 0),
    0,
  );
  // Normalise per 30d so 90-day and 30-day windows score on the same scale.
  const per30 = (totalStress / Math.max(windowDays, 1)) * 30;
  // 0 stress = 100, ≥6 / 30d = 0 (severe).
  const score = clamp(100 * (1 - per30 / 6));
  return {
    score,
    weight: WEIGHTS.environmentalLoad,
    note: `${totalStress.toFixed(1)} stress accumulated (${per30.toFixed(1)}/30d)`,
  };
}

function cadenceHealth(
  wears: WearSample[],
  windowDays: number,
): KfiComponent {
  const weeks = Math.max(windowDays / 7, 1);
  const wpw = wears.length / weeks;
  if (wpw === 0) {
    return {
      score: 50,
      weight: WEIGHTS.cadenceHealth,
      note: "No wear sessions logged — leather likes to be worn",
    };
  }
  const { low, high } = HEALTHY_WEARS_PER_WEEK;
  let score: number;
  if (wpw >= low && wpw <= high) {
    score = 100;
  } else if (wpw < low) {
    score = clamp(100 * (wpw / low));
  } else {
    // Overuse: 4/wk = 100, 10/wk = 0.
    score = clamp(100 * (1 - (wpw - high) / (10 - high)));
  }
  return {
    score,
    weight: WEIGHTS.cadenceHealth,
    note: `${wpw.toFixed(1)} wears/week (healthy band ${low}–${high})`,
  };
}

function computeOnce(
  input: KfiInput,
  windowStart: number,
  windowEnd: number,
): { score: number; components: KfiResult["components"]; bonuses: KfiResult["bonuses"] } {
  const inRange = (d: string) => {
    const t = new Date(d).getTime();
    return t >= windowStart && t <= windowEnd;
  };
  const wears = input.wears.filter((w) => inRange(w.started_at));
  const cares = input.cares.filter((c) => inRange(c.started_at));
  const windowDays = Math.max(
    1,
    Math.round((windowEnd - windowStart) / 86400000),
  );

  const components = {
    maintenanceConsistency: maintenanceConsistency(cares, windowDays, windowEnd),
    careResponsiveness: careResponsiveness(wears, cares),
    environmentalLoad: environmentalLoad(wears, windowDays),
    cadenceHealth: cadenceHealth(wears, windowDays),
  };

  const weighted =
    components.maintenanceConsistency.score * components.maintenanceConsistency.weight +
    components.careResponsiveness.score * components.careResponsiveness.weight +
    components.environmentalLoad.score * components.environmentalLoad.weight +
    components.cadenceHealth.score * components.cadenceHealth.weight;

  // Light trust/quality bonuses, capped so they cannot mask a bad core score.
  const bonuses = {
    repairs: Math.min(input.repairs * 1.5, 4),
    nfc: Math.min(input.nfcScans * 0.3, 3),
  };

  const score = clamp(weighted + bonuses.repairs + bonuses.nfc);
  return { score, components, bonuses };
}

export function computeKfiV2(input: KfiInput): KfiResult {
  const now = input.now ?? Date.now();
  const windowDays = input.windowDays ?? 90;
  const windowMs = windowDays * 86400000;

  const current = computeOnce(input, now - windowMs, now);
  const prev = computeOnce(input, now - 2 * windowMs, now - windowMs);

  const delta = +(current.score - prev.score).toFixed(1);
  const direction: "up" | "flat" | "down" =
    delta > 1.5 ? "up" : delta < -1.5 ? "down" : "flat";

  return {
    score: +current.score.toFixed(1),
    components: current.components,
    bonuses: current.bonuses,
    trend: { direction, delta, previous: +prev.score.toFixed(1) },
  };
}
