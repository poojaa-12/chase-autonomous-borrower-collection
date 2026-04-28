import { Agent } from "@mastra/core/agent";

const DEFAULT_MODEL = "anthropic/claude-3-5-sonnet-latest";

export const classifierAgent = new Agent({
  id: "classifier-agent",
  name: "Classifier Agent",
  instructions:
    "Classify borrower documents for temporal validity. Return concise, deterministic outputs.",
  model: DEFAULT_MODEL
});

export const extractorAgent = new Agent({
  id: "extractor-agent",
  name: "Extractor Agent",
  instructions:
    "Extract structured financial values from borrower submissions and prefer exact numeric values.",
  model: DEFAULT_MODEL
});

export const followUpAgent = new Agent({
  id: "follow-up-agent",
  name: "Follow-Up Agent",
  instructions:
    "Draft professional borrower follow-up emails that clearly request corrected document periods.",
  model: DEFAULT_MODEL
});

export const escalatorAgent = new Agent({
  id: "escalator-agent",
  name: "Escalator Agent",
  instructions:
    "Summarize low-confidence or failed processing outcomes for credit officer handoff.",
  model: DEFAULT_MODEL
});
