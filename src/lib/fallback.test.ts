import { describe, it, expect } from "vitest";
import { decideFallback, fallbackMessage } from "./fallback";

describe("7-day fallback decision tree", () => {
  it("case 1: wear and care logged → no push", () => {
    expect(decideFallback(1, 1).type).toBeNull();
  });
  it("case 2: wear but no care → care_nudge", () => {
    expect(decideFallback(3, 0).type).toBe("care_nudge");
  });
  it("case 3: care but no wear → wear_nudge", () => {
    expect(decideFallback(0, 2).type).toBe("wear_nudge");
  });
  it("case 4: neither → one combined nudge", () => {
    expect(decideFallback(0, 0).type).toBe("weekly_combined_nudge");
  });
  it("uses the shoe name in the title", () => {
    expect(fallbackMessage("care_nudge", "Air Form").title).toBe("Air Form Care Check");
  });
});
