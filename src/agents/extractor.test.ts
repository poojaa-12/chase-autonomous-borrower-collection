import { afterEach, describe, expect, it } from "vitest";
import { extractFinancials } from "./extractor";

const originalKey = process.env.ANTHROPIC_API_KEY;

describe("extractFinancials fallback mode", () => {
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("returns parsed structured financials without external API", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await extractFinancials("Revenue and EBITDA values here");
    expect(result.model).toBe("deterministic-fallback");
    expect(result.attempts).toBe(1);
    expect(result.data).toMatchObject({
      revenue: 1000000,
      ebitda: 250000,
      netIncome: 120000,
      currency: "USD",
      periodEnd: "2025-09-30"
    });
  });
});
