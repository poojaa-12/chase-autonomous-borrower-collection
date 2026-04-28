import { afterEach, describe, expect, it } from "vitest";
import { classifyReply } from "./classifier";

const originalKey = process.env.ANTHROPIC_API_KEY;

describe("classifyReply fallback mode", () => {
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("uses deterministic fallback and detects matching period", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await classifyReply({
      expectedPeriodEnd: "2025-09-30",
      text: "Quarter report. For the quarter ended September 30, 2025."
    });

    expect(result.model).toBe("deterministic-fallback");
    expect(result.detectedPeriodEnd).toBe("September 30, 2025");
    expect(result.isTemporalMatch).toBe(true);
    expect(result.confidence).toBe(0.8);
    expect(result.costUsd).toBe(0);
  });

  it("returns low-confidence fallback when period cannot be extracted", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await classifyReply({
      expectedPeriodEnd: "2025-09-30",
      text: "Random upload with no clear statement date."
    });

    expect(result.detectedPeriodEnd).toBeNull();
    expect(result.isTemporalMatch).toBe(false);
    expect(result.confidence).toBe(0.45);
  });
});
