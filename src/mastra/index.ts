import { Mastra } from "@mastra/core";
import {
  classifierAgent,
  escalatorAgent,
  extractorAgent,
  followUpAgent
} from "./agents";
import { processBorrowerReplyWorkflow } from "./workflows/process-borrower-reply";

export const mastra = new Mastra({
  agents: {
    classifierAgent,
    extractorAgent,
    followUpAgent,
    escalatorAgent
  },
  workflows: {
    processBorrowerReplyWorkflow
  }
});
