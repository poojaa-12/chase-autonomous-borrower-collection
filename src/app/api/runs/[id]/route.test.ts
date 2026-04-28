import { describe, expect, it, vi } from "vitest";
import { getRunSnapshot } from "./handler";

describe("getRunSnapshot", () => {
  it("returns null when run does not exist", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });

    const result = await getRunSnapshot({ db: { select: selectMock } as never }, "run-x");
    expect(result).toBeNull();
  });

  it("returns run and ordered logs when run exists", async () => {
    const run = { id: "run-1", status: "COMPLETED" };
    const logs = [{ id: "log-1", runId: "run-1", step: "classification" }];

    const selectMock = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([run])
          })
        })
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(logs)
          })
        })
      });

    const result = await getRunSnapshot({ db: { select: selectMock } as never }, "run-1");
    expect(result).toEqual({ run, logs });
  });
});
