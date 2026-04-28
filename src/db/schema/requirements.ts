import { pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { requirementStatusEnum } from "./enums";

export const requirements = pgTable("requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  borrowerId: text("borrower_id").notNull(),
  legalEntity: text("legal_entity").notNull(),
  docType: text("doc_type").notNull(),
  expectedPeriodEnd: date("expected_period_end").notNull(),
  status: requirementStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export type Requirement = typeof requirements.$inferSelect;
export type NewRequirement = typeof requirements.$inferInsert;
