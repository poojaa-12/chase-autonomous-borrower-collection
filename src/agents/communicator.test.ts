import { describe, expect, it } from "vitest";
import { draftFollowUpEmail } from "./communicator";

describe("draftFollowUpEmail", () => {
  it("includes expected and detected periods in borrower follow-up", () => {
    const email = draftFollowUpEmail({
      legalEntity: "ACME Corp",
      expectedPeriodEnd: "2025-09-30",
      detectedPeriodEnd: "2025-06-30"
    });

    expect(email).toContain("ACME Corp");
    expect(email).toContain("2025-09-30");
    expect(email).toContain("2025-06-30");
  });

  it("falls back to unknown period when detection is missing", () => {
    const email = draftFollowUpEmail({
      legalEntity: "ACME Corp",
      expectedPeriodEnd: "2025-09-30",
      detectedPeriodEnd: null
    });
    expect(email).toContain("unknown period");
  });
});
