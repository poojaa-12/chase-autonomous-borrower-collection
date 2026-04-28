const DAY_IN_MS = 86_400_000;

function parseDateString(input: string): Date | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function withinDayTolerance(
  actualDate: string,
  expectedDate: string,
  toleranceDays = 2
): boolean {
  const actual = parseDateString(actualDate);
  const expected = parseDateString(expectedDate);
  if (!actual || !expected) return false;

  const delta = Math.abs(actual.getTime() - expected.getTime());
  return delta <= toleranceDays * DAY_IN_MS;
}

export function extractCandidatePeriodEnd(text: string): string | null {
  const regex =
    /(?:period ending|quarter ended|for the quarter ended|as of)\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2})/i;
  const match = text.match(regex);
  return match?.[1] ?? null;
}
