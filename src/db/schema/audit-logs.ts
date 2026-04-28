import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { agentRuns } from "./agent-runs";
import { auditStepEnum } from "./enums";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    step: auditStepEnum("step").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    reasoning: text("reasoning").notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    latencyMs: numeric("latency_ms", { precision: 12, scale: 0 }),
    artifactUrl: text("artifact_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    runIdx: index("audit_logs_run_idx").on(table.runId)
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
