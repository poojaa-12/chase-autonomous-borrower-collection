import Anthropic from "@anthropic-ai/sdk";
import { extractCandidatePeriodEnd, withinDayTolerance } from "@/lib/temporal";

export type ClassificationOutput = {
  isTemporalMatch: boolean;
  detectedPeriodEnd: string | null;
  confidence: number;
  reasoning: string;
  model: string;
  costUsd: number;
};

const PROMPT_VERSION = "classifier-v1";
const MODEL = "claude-3-5-sonnet-latest";

export async function classifyReply(input: {
  expectedPeriodEnd: string;
  text: string;
}): Promise<ClassificationOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const detected = extractCandidatePeriodEnd(input.text);
    const isTemporalMatch = detected
      ? withinDayTolerance(detected, input.expectedPeriodEnd, 2)
      : false;
    return {
      isTemporalMatch,
      detectedPeriodEnd: detected,
      confidence: detected ? 0.8 : 0.45,
      reasoning:
        "ANTHROPIC_API_KEY missing, used deterministic fallback classifier.",
      model: "deterministic-fallback",
      costUsd: 0
    };
  }

  const client = new Anthropic({ apiKey });
  const started = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system:
      "You classify borrower document validity. Return strict JSON with keys: detected_period_end, is_temporal_match, confidence, reasoning.",
    messages: [
      {
        role: "user",
        content: `Expected period end: ${input.expectedPeriodEnd}\n\nDocument text:\n${input.text}`
      }
    ]
  });

  const text = response.content
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");

  let detectedPeriodEnd: string | null = extractCandidatePeriodEnd(input.text);
  let isTemporalMatch = false;
  let confidence = 0.5;
  let reasoning = "LLM response parsed with deterministic fallback.";

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
        detected_period_end?: string;
        is_temporal_match?: boolean;
        confidence?: number;
        reasoning?: string;
      };
      detectedPeriodEnd = parsed.detected_period_end ?? detectedPeriodEnd;
      isTemporalMatch =
        parsed.is_temporal_match ??
        (detectedPeriodEnd
          ? withinDayTolerance(detectedPeriodEnd, input.expectedPeriodEnd, 2)
          : false);
      confidence = parsed.confidence ?? confidence;
      reasoning = parsed.reasoning ?? reasoning;
    }
  } catch {
    isTemporalMatch = detectedPeriodEnd
      ? withinDayTolerance(detectedPeriodEnd, input.expectedPeriodEnd, 2)
      : false;
  }

  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;
  const estimatedCost = inputTokens * 0.000003 + outputTokens * 0.000015;
  const latencyMs = Date.now() - started;

  return {
    isTemporalMatch,
    detectedPeriodEnd,
    confidence,
    reasoning: `${reasoning} (latency_ms=${latencyMs})`,
    model: MODEL,
    costUsd: estimatedCost
  };
}

export const classifierPromptVersion = PROMPT_VERSION;
