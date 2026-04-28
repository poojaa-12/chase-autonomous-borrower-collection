import Anthropic from "@anthropic-ai/sdk";
import { extractedFinancialsSchema, type ExtractedFinancials } from "@/schemas/financials";

const MODEL = "claude-3-5-sonnet-latest";
export const extractorPromptVersion = "extractor-v1";

async function runExtractionRequest(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      revenue: 1000000,
      ebitda: 250000,
      netIncome: 120000,
      currency: "USD",
      periodEnd: "2025-09-30"
    });
  }

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system:
      "Extract financial values from text. Return strict JSON with keys revenue, ebitda, netIncome, currency, periodEnd.",
    messages: [{ role: "user", content: text }]
  });

  return res.content.map((part) => ("text" in part ? part.text : "")).join("\n");
}

export async function extractFinancials(text: string): Promise<{
  data: ExtractedFinancials;
  attempts: number;
  model: string;
}> {
  const first = await runExtractionRequest(text);
  try {
    const data = extractedFinancialsSchema.parse(JSON.parse(extractJson(first)));
    return { data, attempts: 1, model: process.env.ANTHROPIC_API_KEY ? MODEL : "deterministic-fallback" };
  } catch {
    const second = await runExtractionRequest(
      `${text}\n\nYour previous output was invalid JSON schema. Return valid JSON only.`
    );
    const data = extractedFinancialsSchema.parse(JSON.parse(extractJson(second)));
    return { data, attempts: 2, model: process.env.ANTHROPIC_API_KEY ? MODEL : "deterministic-fallback" };
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Could not locate JSON object in extractor response");
  }
  return raw.slice(start, end + 1);
}
