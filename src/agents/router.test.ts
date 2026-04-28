import { describe, expect, it } from "vitest";
import { routeAfterClassification } from "./router";

describe("routeAfterClassification", () => {
  it("routes to escalation when confidence is low", () => {
    const result = routeAfterClassification({
      isTemporalMatch: true,
      confidence: 0.65
    });

    expect(result.nextStep).toBe("escalation");
    expect(result.requirementStatus).toBe("NEEDS_HUMAN_REVIEW");
  });

  it("routes to communication when temporal match fails", () => {
    const result = routeAfterClassification({
      isTemporalMatch: false,
      confidence: 0.9
    });

    expect(result.nextStep).toBe("communication");
    expect(result.requirementStatus).toBe("FOLLOW_UP_REQUIRED");
  });

  it("routes to extraction on confident temporal match", () => {
    const result = routeAfterClassification({
      isTemporalMatch: true,
      confidence: 0.94
    });

    expect(result.nextStep).toBe("extraction");
    expect(result.requirementStatus).toBe("VALIDATED");
  });
});
