import { describe, expect, it, vi } from "vitest";
import { processBorrowerReplyWorkflow } from "./process-borrower-reply";

vi.mock("@/lib/audit", () => ({
  updateRunStatus: vi.fn().mockResolvedValue(undefined),
  updateRequirementStatus: vi.fn().mockResolvedValue(undefined),
  writeAuditLog: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn()
  }
}));

vi.mock("@/agents/classifier", () => ({
  classifierPromptVersion: "classifier-v1",
  classifyReply: vi.fn()
}));

vi.mock("@/agents/extractor", () => ({
  extractorPromptVersion: "extractor-v1",
  extractFinancials: vi.fn()
}));

vi.mock("@/agents/communicator", () => ({
  communicatorPromptVersion: "communicator-v1",
  draftFollowUpEmail: vi.fn()
}));

vi.mock("@/agents/escalator", () => ({
  escalatorPromptVersion: "escalator-v1",
  buildEscalationSummary: vi.fn()
}));

vi.mock("../agents", () => ({
  classifierAgent: { generate: vi.fn().mockResolvedValue({ text: "ok" }) },
  extractorAgent: { generate: vi.fn().mockResolvedValue({ text: "ok" }) },
  followUpAgent: { generate: vi.fn().mockResolvedValue({ text: "ok" }) },
  escalatorAgent: { generate: vi.fn().mockResolvedValue({ text: "ok" }) }
}));

import { db } from "@/db/client";
import { classifyReply } from "@/agents/classifier";
import { extractFinancials } from "@/agents/extractor";
import { draftFollowUpEmail } from "@/agents/communicator";
import { buildEscalationSummary } from "@/agents/escalator";

function setupDbMocks() {
  const reply = {
    extractedText: "For the quarter ended September 30, 2025",
    attachmentName: "q3.pdf"
  };
  const requirement = {
    expectedPeriodEnd: "2025-09-30",
    legalEntity: "ACME Corp"
  };

  vi
    .mocked(db.select as unknown as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([reply])
        })
      })
    } as never)
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([requirement])
        })
      })
    } as never);
}

describe("processBorrowerReplyWorkflow", () => {
  it("routes to extraction", async () => {
    setupDbMocks();
    vi.mocked(classifyReply).mockResolvedValue({
      isTemporalMatch: true,
      detectedPeriodEnd: "2025-09-30",
      confidence: 0.92,
      reasoning: "ok",
      model: "mock-model",
      costUsd: 0
    });
    vi.mocked(extractFinancials).mockResolvedValue({
      attempts: 1,
      model: "mock-model",
      data: {
        revenue: 1,
        ebitda: 1,
        netIncome: 1,
        currency: "USD",
        periodEnd: "2025-09-30"
      }
    });

    const run = await processBorrowerReplyWorkflow.createRun({ runId: "run-1" });
    const result = await run.start({
      inputData: {
        runId: "7dba74db-8f68-4ee7-a95d-6a0a74c8b7a6",
        requirementId: "738f3008-31a6-4b84-b09f-bb8f635f3d14",
        replyId: "6df0f404-9308-4595-a068-bf57126d1c3e"
      }
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.result.routedTo).toBe("extraction");
    }
  });

  it("routes to communication when temporal mismatch", async () => {
    setupDbMocks();
    vi.mocked(classifyReply).mockResolvedValue({
      isTemporalMatch: false,
      detectedPeriodEnd: "2025-06-30",
      confidence: 0.91,
      reasoning: "mismatch",
      model: "mock-model",
      costUsd: 0
    });
    vi.mocked(draftFollowUpEmail).mockReturnValue("follow up");

    const run = await processBorrowerReplyWorkflow.createRun({ runId: "run-2" });
    const result = await run.start({
      inputData: {
        runId: "7dba74db-8f68-4ee7-a95d-6a0a74c8b7a6",
        requirementId: "738f3008-31a6-4b84-b09f-bb8f635f3d14",
        replyId: "6df0f404-9308-4595-a068-bf57126d1c3e"
      }
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.result.routedTo).toBe("communication");
    }
  });

  it("routes to escalation when low confidence", async () => {
    setupDbMocks();
    vi.mocked(classifyReply).mockResolvedValue({
      isTemporalMatch: true,
      detectedPeriodEnd: "2025-09-30",
      confidence: 0.45,
      reasoning: "uncertain",
      model: "mock-model",
      costUsd: 0
    });
    vi.mocked(buildEscalationSummary).mockReturnValue("escalate");

    const run = await processBorrowerReplyWorkflow.createRun({ runId: "run-3" });
    const result = await run.start({
      inputData: {
        runId: "7dba74db-8f68-4ee7-a95d-6a0a74c8b7a6",
        requirementId: "738f3008-31a6-4b84-b09f-bb8f635f3d14",
        replyId: "6df0f404-9308-4595-a068-bf57126d1c3e"
      }
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.result.routedTo).toBe("escalation");
    }
  });
});
