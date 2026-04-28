import { auditLogs, agentRuns, requirements } from "@/db/schema";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";

type AuditInput = {
  runId: string;
  step: "classification" | "extraction" | "communication" | "escalation";
  model: string;
  promptVersion: string;
  reasoning: string;
  confidence: number;
  costUsd?: number;
  latencyMs?: number;
  artifactUrl?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  await db.insert(auditLogs).values({
    runId: input.runId,
    step: input.step,
    model: input.model,
    promptVersion: input.promptVersion,
    reasoning: input.reasoning,
    confidence: input.confidence.toFixed(2),
    costUsd: (input.costUsd ?? 0).toFixed(6),
    latencyMs: input.latencyMs ? String(input.latencyMs) : null,
    artifactUrl: input.artifactUrl ?? null,
    metadata: input.metadata ?? {}
  });
}

export async function updateRunStatus(
  runId: string,
  status: "QUEUED" | "RUNNING" | "FAILED" | "COMPLETED",
  failureReason?: string
) {
  await db
    .update(agentRuns)
    .set({
      status,
      failureReason: failureReason ?? null,
      updatedAt: new Date(),
      completedAt: status === "COMPLETED" ? new Date() : null
    })
    .where(eq(agentRuns.id, runId));
}

export async function updateRequirementStatus(
  requirementId: string,
  status:
    | "PENDING"
    | "RECEIVED"
    | "PROCESSING"
    | "VALIDATED"
    | "FOLLOW_UP_REQUIRED"
    | "NEEDS_HUMAN_REVIEW"
    | "COMPLETED"
) {
  await db
    .update(requirements)
    .set({ status, updatedAt: new Date() })
    .where(eq(requirements.id, requirementId));
}
