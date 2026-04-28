import { describe, expect, it, vi } from "vitest";
import { processBorrowerReplyEvent } from "./process-reply";

function createDeps(overrides?: Partial<Parameters<typeof processBorrowerReplyEvent>[0]>) {
  return {
    getReplyById: vi.fn().mockResolvedValue({
      extractedText: "For the quarter ended September 30, 2025",
      attachmentName: "q3.pdf"
    }),
    getRequirementById: vi.fn().mockResolvedValue({
      expectedPeriodEnd: "2025-09-30",
      legalEntity: "ACME Corp"
    }),
    updateRunStatus: vi.fn().mockResolvedValue(undefined),
    updateRequirementStatus: vi.fn().mockResolvedValue(undefined),
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
    classifyReply: vi.fn().mockResolvedValue({
      isTemporalMatch: true,
      detectedPeriodEnd: "2025-09-30",
      confidence: 0.92,
      reasoning: "Looks valid",
      model: "deterministic-fallback",
      costUsd: 0
    }),
    extractFinancials: vi.fn().mockResolvedValue({
      data: {
        revenue: 1000000,
        ebitda: 250000,
        netIncome: 120000,
        currency: "USD",
        periodEnd: "2025-09-30"
      },
      attempts: 1,
      model: "deterministic-fallback"
    }),
    draftFollowUpEmail: vi.fn().mockReturnValue("follow up email"),
    buildEscalationSummary: vi.fn().mockReturnValue("escalation summary"),
    ...overrides
  };
}

const payload = { runId: "run-1", requirementId: "req-1", replyId: "rep-1" };

describe("processBorrowerReplyEvent", () => {
  it("routes to extraction and completes run", async () => {
    const deps = createDeps();
    const result = await processBorrowerReplyEvent(deps, payload);

    expect(result).toEqual({ routedTo: "extraction", runId: "run-1" });
    expect(deps.extractFinancials).toHaveBeenCalledTimes(1);
    expect(deps.updateRequirementStatus).toHaveBeenCalledWith("req-1", "COMPLETED");
    expect(deps.updateRunStatus).toHaveBeenLastCalledWith("run-1", "COMPLETED");
  });

  it("routes to communication on period mismatch", async () => {
    const deps = createDeps({
      classifyReply: vi.fn().mockResolvedValue({
        isTemporalMatch: false,
        detectedPeriodEnd: "2025-06-30",
        confidence: 0.91,
        reasoning: "Mismatched period",
        model: "deterministic-fallback",
        costUsd: 0
      })
    });

    const result = await processBorrowerReplyEvent(deps, payload);
    expect(result).toEqual({ routedTo: "communication", runId: "run-1" });
    expect(deps.draftFollowUpEmail).toHaveBeenCalledTimes(1);
    expect(deps.extractFinancials).not.toHaveBeenCalled();
  });

  it("routes to escalation on low confidence", async () => {
    const deps = createDeps({
      classifyReply: vi.fn().mockResolvedValue({
        isTemporalMatch: true,
        detectedPeriodEnd: "2025-09-30",
        confidence: 0.45,
        reasoning: "Uncertain",
        model: "deterministic-fallback",
        costUsd: 0
      })
    });

    const result = await processBorrowerReplyEvent(deps, payload);
    expect(result).toEqual({ routedTo: "escalation", runId: "run-1" });
    expect(deps.buildEscalationSummary).toHaveBeenCalledTimes(1);
    expect(deps.updateRunStatus).toHaveBeenLastCalledWith(
      "run-1",
      "FAILED",
      "Escalated to human review"
    );
  });

  it("fails early when reply or requirement is missing", async () => {
    const deps = createDeps({
      getReplyById: vi.fn().mockResolvedValue(undefined)
    });

    await expect(processBorrowerReplyEvent(deps, payload)).rejects.toThrow(
      "Missing required records"
    );
    expect(deps.updateRunStatus).toHaveBeenCalledWith(
      "run-1",
      "FAILED",
      "Missing reply or requirement record"
    );
  });
});
