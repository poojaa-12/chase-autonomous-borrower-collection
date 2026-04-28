import { describe, expect, it } from "vitest";
import { getRuntimeReadiness } from "./runtime-readiness";

describe("getRuntimeReadiness", () => {
  it("reports healthy when required env is set", () => {
    const result = getRuntimeReadiness({ DATABASE_URL: "postgres://example" });
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("reports unhealthy when DATABASE_URL is missing", () => {
    const result = getRuntimeReadiness({});
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["DATABASE_URL"]);
  });
});
