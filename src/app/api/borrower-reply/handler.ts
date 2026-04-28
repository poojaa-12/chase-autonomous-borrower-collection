import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentRuns, replies, requirements } from "@/db/schema";
import { inngest } from "@/inngest/client";

export const payloadSchema = z.object({
  requirementId: z.string().uuid().optional(),
  borrowerId: z.string().min(1),
  legalEntity: z.string().min(1),
  docType: z.string().min(1).default("Q3 Financials"),
  expectedPeriodEnd: z.string().min(1),
  attachmentName: z.string().min(1),
  extractedText: z.string().min(1),
  source: z.string().default("upload")
});

type BorrowerReplyPayload = z.infer<typeof payloadSchema>;

type BorrowerReplyDeps = {
  db: typeof db;
  inngest: typeof inngest;
};

export async function handleBorrowerReply(
  deps: BorrowerReplyDeps,
  body: BorrowerReplyPayload
) {
  const requirementId =
    body.requirementId ??
    (
      await deps.db
        .insert(requirements)
        .values({
          borrowerId: body.borrowerId,
          legalEntity: body.legalEntity,
          docType: body.docType,
          expectedPeriodEnd: body.expectedPeriodEnd,
          status: "PENDING"
        })
        .returning({ id: requirements.id })
    )[0].id;

  const [reply] = await deps.db
    .insert(replies)
    .values({
      requirementId,
      source: body.source,
      attachmentName: body.attachmentName,
      extractedText: body.extractedText
    })
    .returning({ id: replies.id });

  await deps.db
    .update(requirements)
    .set({ status: "RECEIVED", updatedAt: new Date() })
    .where(eq(requirements.id, requirementId));

  const [run] = await deps.db
    .insert(agentRuns)
    .values({
      requirementId,
      replyId: reply.id,
      status: "QUEUED"
    })
    .returning({ id: agentRuns.id });

  await deps.inngest.send({
    name: "borrower/reply.received",
    data: {
      runId: run.id,
      requirementId,
      replyId: reply.id
    }
  });

  return { runId: run.id, requirementId };
}
