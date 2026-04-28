import { inngest } from "@/inngest/client";
import { processBorrowerReplyWorkflow } from "@/mastra/workflows/process-borrower-reply";

type EventPayload = {
  runId: string;
  requirementId: string;
  replyId: string;
};

export async function handleProcessBorrowerReplyEvent(payload: EventPayload) {
  const run = await processBorrowerReplyWorkflow.createRun({
    runId: payload.runId
  });
  const result = await run.start({ inputData: payload });
  if (result.status === "success") {
    return result.result;
  }
  if (result.status === "failed") {
    throw result.error;
  }
  throw new Error(`Mastra workflow did not complete successfully: ${result.status}`);
}

export const processBorrowerReply = inngest.createFunction(
  { id: "process-borrower-reply", triggers: [{ event: "borrower/reply.received" }] },
  async ({ event }: { event: { data: EventPayload } }) => {
    return handleProcessBorrowerReplyEvent(event.data);
  }
);
