// Pure 7-day fallback decision tree (shared by server + tests).
import type { NotificationType } from "@/lib/notify/types";

export type CatchUpMode = "care" | "wear" | "combined";

export type FallbackDecision =
  | { case: 1; type: null }
  | { case: 2; type: "care_nudge"; mode: "care" }
  | { case: 3; type: "wear_nudge"; mode: "wear" }
  | { case: 4; type: "weekly_combined_nudge"; mode: "combined" };

export function decideFallback(wear7: number, care7: number): FallbackDecision {
  if (wear7 >= 1 && care7 >= 1) return { case: 1, type: null };
  if (wear7 >= 1) return { case: 2, type: "care_nudge", mode: "care" };
  if (care7 >= 1) return { case: 3, type: "wear_nudge", mode: "wear" };
  return { case: 4, type: "weekly_combined_nudge", mode: "combined" };
}

export function fallbackMessage(
  type: Exclude<FallbackDecision["type"], null>,
  shoe: string,
): { title: string; body: string } {
  switch (type) {
    case "care_nudge":
      return {
        title: `${shoe} Care Check`,
        body: `You've stepped out in your ${shoe} this week, but no cleaning session is recorded. Tap your Care Kit chip or open to log care and protect your KFI™.`,
      };
    case "wear_nudge":
      return {
        title: `${shoe} Weekly Wear Check`,
        body: `Your care ledger is up to date, but no outings were recorded this week. Did you wear your ${shoe}?`,
      };
    case "weekly_combined_nudge":
      return {
        title: `Weekly Passport Check-In • ${shoe}`,
        body: "No wear or cleaning activity recorded this week. Tap to quickly update your weekly wear count and care status.",
      };
  }
}

export const MODE_FOR: Record<string, CatchUpMode> = {
  care_nudge: "care",
  wear_nudge: "wear",
  weekly_combined_nudge: "combined",
} satisfies Partial<Record<NotificationType, CatchUpMode>>;
