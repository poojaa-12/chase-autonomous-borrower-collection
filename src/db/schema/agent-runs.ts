import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { replies } from "./replies";
import { requirements } from "./requirements";
import { runStatusEnum } from "./enums";

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    replyId: uuid("reply_id")
      .notNull()
      .references(() => replies.id, { onDelete: "cascade" }),
    status: runStatusEnum("status").notNull().default("QUEUED"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => ({
    requirementIdx: index("agent_runs_requirement_idx").on(table.requirementId)
  })
);

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
