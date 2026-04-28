import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { handleBorrowerReply } from "./handler";

function buildInsertChain(result: unknown) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result)
    })
  };
}

describe("handleBorrowerReply", () => {
  it("creates requirement, reply, run and sends inngest event", async () => {
    const insertMock = vi
      .fn()
      .mockReturnValueOnce(buildInsertChain([{ id: "req-1" }]))
      .mockReturnValueOnce(buildInsertChain([{ id: "rep-1" }]))
      .mockReturnValueOnce(buildInsertChain([{ id: "run-1" }]));

    const updateMock = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });

    const sendMock = vi.fn().mockResolvedValue(undefined);

    const result = await handleBorrowerReply(
      {
        db: {
          insert: insertMock,
          update: updateMock
        } as never,
        inngest: { send: sendMock } as never
      },
      {
        borrowerId: "borrower-1",
        legalEntity: "ACME Inc",
        docType: "Q3 Financials",
        expectedPeriodEnd: "2025-09-30",
        attachmentName: "q3.pdf",
        extractedText: "For the quarter ended September 30, 2025",
        source: "upload"
      }
    );

    expect(result).toEqual({ runId: "run-1", requirementId: "req-1" });
    expect(insertMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledWith({
      name: "borrower/reply.received",
      data: { runId: "run-1", requirementId: "req-1", replyId: "rep-1" }
    });
  });
});

describe("POST /api/borrower-reply", () => {
  it("returns 400 on invalid request body", async () => {
    const request = new Request("http://localhost/api/borrower-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ borrowerId: "missing-required-fields" })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
