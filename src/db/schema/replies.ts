import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { requirements } from "./requirements";

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("upload"),
    attachmentName: text("attachment_name").notNull(),
    attachmentUrl: text("attachment_url"),
    extractedText: text("extracted_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    requirementIdx: index("replies_requirement_idx").on(table.requirementId)
  })
);

export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
