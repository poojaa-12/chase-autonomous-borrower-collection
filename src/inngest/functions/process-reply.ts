import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/db/client";
import { replies, requirements } from "@/db/schema";
import {
  updateRequirementStatus,
  updateRunStatus,
  writeAuditLog
} from "@/lib/audit";
import {
  classifyReply,
  classifierPromptVersion
} from "@/agents/classifier";
import { routeAfterClassification } from "@/agents/router";
import { extractFinancials, extractorPromptVersion } from "@/agents/extractor";
import {
  communicatorPromptVersion,
  draftFollowUpEmail
} from "@/agents/communicator";
import {
  buildEscalationSummary,
  escalatorPromptVersion
} from "@/agents/escalator";

type EventPayload = {
  runId: string;
  requirementId: string;
  replyId: string;
};

type ReplyRecord = {
  extractedText: string | null;
  attachmentName: string;
};

type RequirementRecord = {
  expectedPeriodEnd: string;
  legalEntity: string;
};

type ProcessDeps = {
  getReplyById: (replyId: string) => Promise<ReplyRecord | undefined>;
  getRequirementById: (requirementId: string) => Promise<RequirementRecord | undefined>;
  updateRunStatus: typeof updateRunStatus;
  updateRequirementStatus: typeof updateRequirementStatus;
  writeAuditLog: typeof writeAuditLog;
  classifyReply: typeof classifyReply;
  extractFinancials: typeof extractFinancials;
  draftFollowUpEmail: typeof draftFollowUpEmail;
  buildEscalationSummary: typeof buildEscalationSummary;
};

export async function processBorrowerReplyEvent(
  deps: ProcessDeps,
  payload: EventPayload
) {
  const { runId, requirementId, replyId } = payload;

  await deps.updateRunStatus(runId, "RUNNING");
  await deps.updateRequirementStatus(requirementId, "PROCESSING");

  const replyRecord = await deps.getReplyById(replyId);
  const requirementRecord = await deps.getRequirementById(requirementId);

  if (!replyRecord || !requirementRecord) {
    await deps.updateRunStatus(runId, "FAILED", "Missing reply or requirement record");
    throw new Error("Missing required records");
  }

  const sourceText = replyRecord.extractedText ?? replyRecord.attachmentName;
  const classification = await deps.classifyReply({
    expectedPeriodEnd: requirementRecord.expectedPeriodEnd,
    text: sourceText
  });

  await deps.writeAuditLog({
    runId,
    step: "classification",
    model: classification.model,
    promptVersion: classifierPromptVersion,
    reasoning: classification.reasoning,
    confidence: classification.confidence,
    costUsd: classification.costUsd,
    metadata: { detectedPeriodEnd: classification.detectedPeriodEnd }
  });

  const route = routeAfterClassification({
    isTemporalMatch: classification.isTemporalMatch,
    confidence: classification.confidence
  });
  await deps.updateRequirementStatus(requirementId, route.requirementStatus);

  if (route.nextStep === "extraction") {
    const extracted = await deps.extractFinancials(sourceText);
    await deps.writeAuditLog({
      runId,
      step: "extraction",
      model: extracted.model,
      promptVersion: extractorPromptVersion,
      reasoning: `Extraction succeeded in ${extracted.attempts} attempt(s).`,
      confidence: 0.93,
      costUsd: 0,
      metadata: extracted.data
    });
    await deps.updateRequirementStatus(requirementId, "COMPLETED");
    await deps.updateRunStatus(runId, "COMPLETED");
    return { routedTo: "extraction", runId };
  }

  if (route.nextStep === "communication") {
    const email = deps.draftFollowUpEmail({
      legalEntity: requirementRecord.legalEntity,
      expectedPeriodEnd: requirementRecord.expectedPeriodEnd,
      detectedPeriodEnd: classification.detectedPeriodEnd
    });

    await deps.writeAuditLog({
      runId,
      step: "communication",
      model: "template-communicator",
      promptVersion: communicatorPromptVersion,
      reasoning: "Generated borrower follow-up due to temporal mismatch.",
      confidence: 0.9,
      costUsd: 0,
      metadata: { emailDraft: email }
    });

    await deps.updateRunStatus(runId, "COMPLETED");
    return { routedTo: "communication", runId };
  }

  const escalationSummary = deps.buildEscalationSummary({
    reason: route.reason,
    confidence: classification.confidence,
    requirementId,
    replyId
  });
  await deps.writeAuditLog({
    runId,
    step: "escalation",
    model: "template-escalator",
    promptVersion: escalatorPromptVersion,
    reasoning: escalationSummary,
    confidence: classification.confidence,
    costUsd: 0
  });

  await deps.updateRunStatus(runId, "FAILED", "Escalated to human review");
  return { routedTo: "escalation", runId };
}

const liveDeps: ProcessDeps = {
  getReplyById: async (replyId) => {
    const rows = await db
      .select()
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    return rows[0];
  },
  getRequirementById: async (requirementId) => {
    const rows = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, requirementId))
      .limit(1);
    return rows[0];
  },
  updateRunStatus,
  updateRequirementStatus,
  writeAuditLog,
  classifyReply,
  extractFinancials,
  draftFollowUpEmail,
  buildEscalationSummary
};

export const processBorrowerReply = inngest.createFunction(
  { id: "process-borrower-reply", triggers: [{ event: "borrower/reply.received" }] },
  async ({ event }: { event: { data: EventPayload } }) => {
    return processBorrowerReplyEvent(liveDeps, event.data);
  }
);
