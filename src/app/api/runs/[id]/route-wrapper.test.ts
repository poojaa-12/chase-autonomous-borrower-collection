import { describe, expect, it, vi } from "vitest";

vi.mock("./handler", () => ({
  getRunSnapshot: vi.fn()
}));

import { GET } from "./route";
import { getRunSnapshot } from "./handler";

describe("GET /api/runs/[id] route wrapper", () => {
  it("returns 404 when snapshot is missing", async () => {
    vi.mocked(getRunSnapshot).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "run-x" })
    });

    expect(response.status).toBe(404);
  });

  it("returns serialized snapshot when found", async () => {
    vi.mocked(getRunSnapshot).mockResolvedValueOnce({
      run: { id: "run-1", status: "COMPLETED" } as never,
      logs: [{ id: "log-1" }] as never
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "run-1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.run.id).toBe("run-1");
  });
});
