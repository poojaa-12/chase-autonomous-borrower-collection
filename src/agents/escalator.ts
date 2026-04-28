export const escalatorPromptVersion = "escalator-v1";

export function buildEscalationSummary(input: {
  reason: string;
  confidence: number;
  requirementId: string;
  replyId: string;
}): string {
  return [
    `Escalation required for requirement ${input.requirementId}.`,
    `Reply ${input.replyId} could not be confidently processed.`,
    `Reason: ${input.reason}`,
    `Confidence: ${input.confidence.toFixed(2)}`,
    `Recommended action: credit officer manual review and borrower outreach.`
  ].join(" ");
}
