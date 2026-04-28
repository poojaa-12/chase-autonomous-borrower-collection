import { describe, expect, it } from "vitest";
import { buildEscalationSummary } from "./escalator";

describe("buildEscalationSummary", () => {
  it("produces human-readable escalation guidance", () => {
    const summary = buildEscalationSummary({
      reason: "Low confidence result requires human review",
      confidence: 0.63,
      requirementId: "req-1",
      replyId: "rep-1"
    });

    expect(summary).toContain("requirement req-1");
    expect(summary).toContain("Reply rep-1");
    expect(summary).toContain("Confidence: 0.63");
    expect(summary).toContain("manual review");
  });
});
