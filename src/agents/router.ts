export type RouteDecision =
  | { nextStep: "extraction"; requirementStatus: "VALIDATED"; reason: string }
  | {
      nextStep: "communication";
      requirementStatus: "FOLLOW_UP_REQUIRED";
      reason: string;
    }
  | {
      nextStep: "escalation";
      requirementStatus: "NEEDS_HUMAN_REVIEW";
      reason: string;
    };

type RouteInput = {
  isTemporalMatch: boolean;
  confidence: number;
};

export function routeAfterClassification(input: RouteInput): RouteDecision {
  if (input.confidence < 0.7) {
    return {
      nextStep: "escalation",
      requirementStatus: "NEEDS_HUMAN_REVIEW",
      reason: "Low confidence result requires human review"
    };
  }

  if (!input.isTemporalMatch) {
    return {
      nextStep: "communication",
      requirementStatus: "FOLLOW_UP_REQUIRED",
      reason: "Document period mismatched expected period"
    };
  }

  return {
    nextStep: "extraction",
    requirementStatus: "VALIDATED",
    reason: "Document is valid for extraction"
  };
}
