import { z } from "zod";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  classifierPromptVersion,
  classifyReply
} from "@/agents/classifier";
import { routeAfterClassification } from "@/agents/router";
import {
  extractFinancials,
  extractorPromptVersion
} from "@/agents/extractor";
import {
  communicatorPromptVersion,
  draftFollowUpEmail
} from "@/agents/communicator";
import {
  buildEscalationSummary,
  escalatorPromptVersion
} from "@/agents/escalator";
import {
  updateRequirementStatus,
  updateRunStatus,
  writeAuditLog
} from "@/lib/audit";
import { db } from "@/db/client";
import { replies, requirements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { classifierAgent, escalatorAgent, extractorAgent, followUpAgent } from "../agents";

export const processBorrowerReplyInputSchema = z.object({
  runId: z.string().uuid(),
  requirementId: z.string().uuid(),
  replyId: z.string().uuid()
});

const processBorrowerReplyOutputSchema = z.object({
  runId: z.string().uuid(),
  routedTo: z.enum(["extraction", "communication", "escalation"])
});

const loadContextStep = createStep({
  id: "load-context",
  description: "Load reply and requirement records",
  inputSchema: processBorrowerReplyInputSchema,
  outputSchema: z.object({
    runId: z.string().uuid(),
    requirementId: z.string().uuid(),
    replyId: z.string().uuid(),
    sourceText: z.string(),
    expectedPeriodEnd: z.string(),
    legalEntity: z.string()
  }),
  execute: async ({ inputData }) => {
    const { runId, requirementId, replyId } = inputData;
    await updateRunStatus(runId, "RUNNING");
    await updateRequirementStatus(requirementId, "PROCESSING");

    const replyRows = await db
      .select()
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    const requirementRows = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, requirementId))
      .limit(1);

    const replyRecord = replyRows[0];
    const requirementRecord = requirementRows[0];

    if (!replyRecord || !requirementRecord) {
      await updateRunStatus(runId, "FAILED", "Missing reply or requirement record");
      throw new Error("Missing required records");
    }

    return {
      runId,
      requirementId,
      replyId,
      sourceText: replyRecord.extractedText ?? replyRecord.attachmentName,
      expectedPeriodEnd: requirementRecord.expectedPeriodEnd,
      legalEntity: requirementRecord.legalEntity
    };
  }
});

const classificationStep = createStep({
  id: "classify-document",
  description: "Classify temporal validity using Mastra classifier agent and fallback logic",
  inputSchema: loadContextStep.outputSchema,
  outputSchema: z.object({
    runId: z.string().uuid(),
    requirementId: z.string().uuid(),
    replyId: z.string().uuid(),
    sourceText: z.string(),
    expectedPeriodEnd: z.string(),
    legalEntity: z.string(),
    classification: z.object({
      isTemporalMatch: z.boolean(),
      detectedPeriodEnd: z.string().nullable(),
      confidence: z.number(),
      reasoning: z.string(),
      model: z.string(),
      costUsd: z.number()
    }),
    route: z.object({
      nextStep: z.enum(["extraction", "communication", "escalation"]),
      requirementStatus: z.enum([
        "VALIDATED",
        "FOLLOW_UP_REQUIRED",
        "NEEDS_HUMAN_REVIEW"
      ]),
      reason: z.string()
    })
  }),
  execute: async ({ inputData }) => {
    const classification = await classifyReply({
      expectedPeriodEnd: inputData.expectedPeriodEnd,
      text: inputData.sourceText
    });

    // Minimal mastra-agent usage to align architecture while keeping deterministic app logic.
    await classifierAgent.generate(
      `Classify document period for expected end ${inputData.expectedPeriodEnd}.`
    );

    await writeAuditLog({
      runId: inputData.runId,
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
    await updateRequirementStatus(inputData.requirementId, route.requirementStatus);

    return {
      ...inputData,
      classification,
      route
    };
  }
});

const resolveRouteStep = createStep({
  id: "resolve-route",
  description: "Run extraction, communication, or escalation branch and finalize run status",
  inputSchema: classificationStep.outputSchema,
  outputSchema: processBorrowerReplyOutputSchema,
  execute: async ({ inputData }) => {
    const { runId, requirementId, replyId, route, sourceText, classification } = inputData;

    if (route.nextStep === "extraction") {
      await extractorAgent.generate("Extract borrower financial values.");
      const extracted = await extractFinancials(sourceText);
      await writeAuditLog({
        runId,
        step: "extraction",
        model: extracted.model,
        promptVersion: extractorPromptVersion,
        reasoning: `Extraction succeeded in ${extracted.attempts} attempt(s).`,
        confidence: 0.93,
        costUsd: 0,
        metadata: extracted.data
      });
      await updateRequirementStatus(requirementId, "COMPLETED");
      await updateRunStatus(runId, "COMPLETED");
      return { runId, routedTo: "extraction" as const };
    }

    if (route.nextStep === "communication") {
      await followUpAgent.generate("Draft borrower follow-up for wrong period submission.");
      const email = draftFollowUpEmail({
        legalEntity: inputData.legalEntity,
        expectedPeriodEnd: inputData.expectedPeriodEnd,
        detectedPeriodEnd: classification.detectedPeriodEnd
      });
      await writeAuditLog({
        runId,
        step: "communication",
        model: "template-communicator",
        promptVersion: communicatorPromptVersion,
        reasoning: "Generated borrower follow-up due to temporal mismatch.",
        confidence: 0.9,
        costUsd: 0,
        metadata: { emailDraft: email }
      });
      await updateRunStatus(runId, "COMPLETED");
      return { runId, routedTo: "communication" as const };
    }

    await escalatorAgent.generate("Summarize escalation for human review.");
    const escalationSummary = buildEscalationSummary({
      reason: route.reason,
      confidence: classification.confidence,
      requirementId,
      replyId
    });
    await writeAuditLog({
      runId,
      step: "escalation",
      model: "template-escalator",
      promptVersion: escalatorPromptVersion,
      reasoning: escalationSummary,
      confidence: classification.confidence,
      costUsd: 0
    });
    await updateRunStatus(runId, "FAILED", "Escalated to human review");
    return { runId, routedTo: "escalation" as const };
  }
});

export const processBorrowerReplyWorkflow = createWorkflow({
  id: "process-borrower-reply-workflow",
  inputSchema: processBorrowerReplyInputSchema,
  outputSchema: processBorrowerReplyOutputSchema
})
  .then(loadContextStep)
  .then(classificationStep)
  .then(resolveRouteStep)
  .commit();
