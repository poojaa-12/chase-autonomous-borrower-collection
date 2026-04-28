import { describe, expect, it, vi } from "vitest";
vi.mock("@/mastra/workflows/process-borrower-reply", () => ({
  processBorrowerReplyWorkflow: {
    createRun: vi.fn()
  }
}));

import { handleProcessBorrowerReplyEvent } from "./process-reply";
import { processBorrowerReplyWorkflow } from "@/mastra/workflows/process-borrower-reply";

describe("processBorrowerReply inngest wrapper", () => {
  it("delegates orchestration to Mastra workflow", async () => {
    const start = vi.fn().mockResolvedValue({
      status: "success",
      result: { runId: "run-1", routedTo: "extraction" }
    });
    vi.mocked(processBorrowerReplyWorkflow.createRun).mockResolvedValueOnce({
      start
    } as never);

    const result = await handleProcessBorrowerReplyEvent({
      runId: "7dba74db-8f68-4ee7-a95d-6a0a74c8b7a6",
      requirementId: "738f3008-31a6-4b84-b09f-bb8f635f3d14",
      replyId: "6df0f404-9308-4595-a068-bf57126d1c3e"
    });

    expect(processBorrowerReplyWorkflow.createRun).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ runId: "run-1", routedTo: "extraction" });
  });

  it("throws when mastra workflow run is not successful", async () => {
    const start = vi.fn().mockResolvedValue({
      status: "failed",
      error: new Error("workflow failed")
    });
    vi.mocked(processBorrowerReplyWorkflow.createRun).mockResolvedValueOnce({
      start
    } as never);

    await expect(
      handleProcessBorrowerReplyEvent({
        runId: "7dba74db-8f68-4ee7-a95d-6a0a74c8b7a6",
        requirementId: "738f3008-31a6-4b84-b09f-bb8f635f3d14",
        replyId: "6df0f404-9308-4595-a068-bf57126d1c3e"
      })
    ).rejects.toThrow("workflow failed");
  });
});
