import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const valuesSpy = vi.fn().mockResolvedValue(undefined);
  const whereSpy = vi.fn().mockResolvedValue(undefined);
  const setSpy = vi.fn().mockReturnValue({ where: whereSpy });
  const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: setSpy });
  return { valuesSpy, whereSpy, setSpy, insertSpy, updateSpy };
});

vi.mock("@/db/client", () => ({
  db: {
    insert: mocks.insertSpy,
    update: mocks.updateSpy
  }
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({ mocked: true }))
}));

import { writeAuditLog, updateRequirementStatus, updateRunStatus } from "./audit";

describe("audit helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertSpy.mockReturnValue({ values: mocks.valuesSpy });
    mocks.updateSpy.mockReturnValue({ set: mocks.setSpy });
    mocks.setSpy.mockReturnValue({ where: mocks.whereSpy });
  });

  it("writes normalized audit log payload", async () => {
    await writeAuditLog({
      runId: "run-1",
      step: "classification",
      model: "test-model",
      promptVersion: "v1",
      reasoning: "classification result",
      confidence: 0.876,
      costUsd: 0.00123,
      latencyMs: 120,
      metadata: { foo: "bar" }
    });

    expect(mocks.insertSpy).toHaveBeenCalledTimes(1);
    expect(mocks.valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        confidence: "0.88",
        costUsd: "0.001230",
        latencyMs: "120"
      })
    );
  });

  it("marks run completed with completion timestamp", async () => {
    await updateRunStatus("run-1", "COMPLETED");
    expect(mocks.updateSpy).toHaveBeenCalledTimes(1);
    expect(mocks.setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        completedAt: expect.any(Date)
      })
    );
    expect(mocks.whereSpy).toHaveBeenCalledTimes(1);
  });

  it("updates requirement status", async () => {
    await updateRequirementStatus("req-1", "FOLLOW_UP_REQUIRED");
    expect(mocks.updateSpy).toHaveBeenCalledTimes(1);
    expect(mocks.setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FOLLOW_UP_REQUIRED",
        updatedAt: expect.any(Date)
      })
    );
  });
});
