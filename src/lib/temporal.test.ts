import { describe, expect, it } from "vitest";
import { extractCandidatePeriodEnd, withinDayTolerance } from "./temporal";

describe("withinDayTolerance", () => {
  it("returns true inside tolerance window", () => {
    expect(withinDayTolerance("2025-09-29", "2025-09-30", 2)).toBe(true);
  });

  it("returns false outside tolerance window", () => {
    expect(withinDayTolerance("2025-10-10", "2025-09-30", 2)).toBe(false);
  });

  it("returns false for invalid dates", () => {
    expect(withinDayTolerance("not-a-date", "2025-09-30")).toBe(false);
  });
});

describe("extractCandidatePeriodEnd", () => {
  it("extracts period ending phrase date", () => {
    const text = "Consolidated statements. Period ending September 30, 2025";
    expect(extractCandidatePeriodEnd(text)).toBe("September 30, 2025");
  });

  it("extracts ISO date after 'as of'", () => {
    const text = "Balance sheet as of 2025-09-30 for the entity";
    expect(extractCandidatePeriodEnd(text)).toBe("2025-09-30");
  });

  it("returns null if no date signal exists", () => {
    expect(extractCandidatePeriodEnd("No useful period marker")).toBeNull();
  });
});
