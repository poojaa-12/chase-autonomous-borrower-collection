import { pgEnum } from "drizzle-orm/pg-core";

export const requirementStatusEnum = pgEnum("requirement_status", [
  "PENDING",
  "RECEIVED",
  "PROCESSING",
  "VALIDATED",
  "FOLLOW_UP_REQUIRED",
  "NEEDS_HUMAN_REVIEW",
  "COMPLETED"
]);

export const runStatusEnum = pgEnum("run_status", [
  "QUEUED",
  "RUNNING",
  "FAILED",
  "COMPLETED"
]);

export const auditStepEnum = pgEnum("audit_step", [
  "classification",
  "extraction",
  "communication",
  "escalation"
]);
