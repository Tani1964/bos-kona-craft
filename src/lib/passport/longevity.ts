// ─────────────────────────────────────────────────────────────────────────────
// Longevity Simulator (range output)
// Pure, deterministic. Consumes behaviour + environment + material to project
// a *range* of useful lifespan in years with a confidence score.
// ─────────────────────────────────────────────────────────────────────────────

export type MaterialKey = "leather" | "denim" | "crepe" | "canvas" | "default";

export type TransportMix = {
  walking: number; // 0..1
  transit: number; // 0..1
  car: number; // 0..1
};

export interface LongevityInputs {
  material: MaterialKey;
  ageDays: number;
  /** Total wear sessions in lookback window (default 90d). */
  wearEvents: number;
  /** Sum of effective_stress across those wear sessions. */
  effectiveStress: number;
  /** Completed care sessions in same window. */
  careSessions: number;
  /** Days since last completed care, null if never. */
  daysSinceCare: number | null;
  /** Mix of transport modes across wear events. Sums to ~1. */
  transportMix: TransportMix;
  /** Atelier-grade repairs (lifetime). */
  repairs: number;
  /** Window the wear/care counts cover, in days. */
  windowDays?: number;
}

export interface LongevityOutput {
  low_years: number;
  high_years: number;
  confidence: number; // 0..1
  components: {
    materialBaseYears: number;
    wearsPerYear: number;
    careRatio: number; // care sessions per wear event
    stressPerWear: number;
    transportFactor: number;
    careFactor: number;
    stressFactor: number;
    repairBonusYears: number;
  };
  notes: string[];
}

const MATERIAL_BASE: Record<MaterialKey, number> = {
  leather: 14,
  denim: 9,
  canvas: 7,
  crepe: 5,
  default: 8,
};

export function inferMaterial(modelName: string | null | undefined): MaterialKey {
  if (!modelName) return "default";
  const n = modelName.toLowerCase();
  if (/(leather|hide|suede|nappa)/.test(n)) return "leather";
  if (/(denim|jean|selvedge|raw)/.test(n)) return "denim";
  if (/(crepe|natural rubber)/.test(n)) return "crepe";
  if (/(canvas|cotton|linen)/.test(n)) return "canvas";
  return "default";
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export function computeLongevity(input: LongevityInputs): LongevityOutput {
  const windowDays = input.windowDays ?? 90;
  const yearsInWindow = windowDays / 365;

  const wearsPerYear =
    input.wearEvents > 0
      ? input.wearEvents / yearsInWindow
      : 0;
  const careRatio =
    input.wearEvents > 0
      ? input.careSessions / input.wearEvents
      : input.careSessions > 0
        ? 1
        : 0;
  const stressPerWear =
    input.wearEvents > 0 ? input.effectiveStress / input.wearEvents : 0;

  const materialBaseYears = MATERIAL_BASE[input.material] ?? MATERIAL_BASE.default;

  // ── Multipliers ─────────────────────────────────────────────
  // Care: 0 ratio → 0.75x lifespan; 0.3+ → up to 1.25x.
  const careFactor = clamp(0.75 + careRatio * 1.6, 0.7, 1.3);

  // Stress per wear: 0 → 1.05x; high (≥1.5) → ~0.7x.
  const stressFactor = clamp(1.05 - stressPerWear * 0.22, 0.6, 1.1);

  // Transport: walking is hardest, car easiest.
  const tm = input.transportMix;
  const transportFactor =
    tm.walking * 0.85 + tm.transit * 1.0 + tm.car * 1.15 || 1.0;

  // Wear cadence: punish very high wear/year, reward moderate rotation.
  // Below ~80/yr neutral; above scales down toward 0.7.
  const cadenceFactor =
    wearsPerYear <= 0
      ? 1.0
      : wearsPerYear < 80
        ? 1.0
        : clamp(1.0 - (wearsPerYear - 80) / 200, 0.7, 1.0);

  // Stale care penalty (multiplicative on careFactor).
  const stalePenalty =
    input.daysSinceCare != null && input.daysSinceCare > 60
      ? clamp(1.0 - (input.daysSinceCare - 60) / 240, 0.75, 1.0)
      : 1.0;

  const repairBonusYears = clamp(input.repairs * 0.8, 0, 6);

  const center =
    materialBaseYears *
      careFactor *
      stressFactor *
      transportFactor *
      cadenceFactor *
      stalePenalty +
    repairBonusYears;

  // Discount remaining lifespan by age already lived.
  const yearsLived = input.ageDays / 365;
  const remaining = Math.max(center - yearsLived * 0.5, 1.5);

  // Range width depends on how much real signal we have.
  // More wear/care events → tighter range.
  const signal = Math.min(input.wearEvents + input.careSessions, 30);
  const confidence = clamp(0.35 + signal / 50, 0.35, 0.92);
  const widthPct = 0.45 - confidence * 0.35; // 0.13 .. 0.34

  const low = remaining * (1 - widthPct);
  const high = remaining * (1 + widthPct);

  const notes: string[] = [];
  if (input.wearEvents < 3)
    notes.push("Early signal — projection will sharpen with more wear sessions.");
  if (careRatio < 0.05 && input.wearEvents > 0)
    notes.push("Care cadence is light; regular conditioning lifts the range.");
  if (stressPerWear > 1.2)
    notes.push("Recent wears carried weather stress — air-dry between uses.");
  if (input.daysSinceCare != null && input.daysSinceCare > 60)
    notes.push(`${input.daysSinceCare} days since last care session.`);

  return {
    low_years: +low.toFixed(1),
    high_years: +high.toFixed(1),
    confidence: +confidence.toFixed(2),
    components: {
      materialBaseYears,
      wearsPerYear: +wearsPerYear.toFixed(1),
      careRatio: +careRatio.toFixed(2),
      stressPerWear: +stressPerWear.toFixed(2),
      transportFactor: +transportFactor.toFixed(2),
      careFactor: +careFactor.toFixed(2),
      stressFactor: +stressFactor.toFixed(2),
      repairBonusYears: +repairBonusYears.toFixed(1),
    },
    notes,
  };
}
