type ReadinessReport = {
  ok: boolean;
  missing: string[];
};

export function getRuntimeReadiness(
  env: Record<string, string | undefined>
): ReadinessReport {
  const required = ["DATABASE_URL"];
  const missing = required.filter((key) => !env[key]);
  return { ok: missing.length === 0, missing };
}
