export const communicatorPromptVersion = "communicator-v1";

export function draftFollowUpEmail(input: {
  legalEntity: string;
  expectedPeriodEnd: string;
  detectedPeriodEnd: string | null;
}): string {
  const detected = input.detectedPeriodEnd ?? "unknown period";
  return [
    `Hi team,`,
    ``,
    `Thanks for sending over the financials for ${input.legalEntity}.`,
    `We need statements for period ending ${input.expectedPeriodEnd}, but the uploaded file appears to reference ${detected}.`,
    `Could you resend the correct period when convenient?`,
    ``,
    `Best,`,
    `Relationship Manager`
  ].join("\n");
}
