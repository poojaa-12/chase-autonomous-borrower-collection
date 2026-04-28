import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 503 when DATABASE_URL missing", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.missing).toContain("DATABASE_URL");

    if (original) process.env.DATABASE_URL = original;
  });

  it("returns 200 when DATABASE_URL exists", async () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://example";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    if (original) process.env.DATABASE_URL = original;
    else delete process.env.DATABASE_URL;
  });
});
