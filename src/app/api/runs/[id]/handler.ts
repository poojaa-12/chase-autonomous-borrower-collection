import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, agentRuns } from "@/db/schema";

type RunsRouteDeps = {
  db: typeof db;
};

export async function getRunSnapshot(deps: RunsRouteDeps, id: string) {
  const [run] = await deps.db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, id))
    .limit(1);

  if (!run) return null;

  const logs = await deps.db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.runId, id))
    .orderBy(asc(auditLogs.createdAt));

  return { run, logs };
}
