# Eval logs and failure analysis

## Golden set summary

Eight difficult borrower scenarios; target outcomes documented in [README.md](../README.md).

## ob-06: Off-by-one day (Follow-up expected, run failed)

**Symptom:** Classifier / temporal branch did not reliably treat **Sept 29** vs **Sept 30** (or similar boundary) as within the intended **±2 day** tolerance relative to expected quarter end.

**Hypothesis:** Raw LLM comparison without deterministic **date normalization** (timezone, “as of” vs “through,” fiscal calendar) amplifies noise at quarter boundaries.

**Mitigation (planned):**

1. Pre-parse dates with a shared **date utility** (single canonical `period_end` per requirement).
2. Compare **UTC-normalized** instants or **calendar dates** explicitly, not prose-in → prose-out.
3. Optionally **bump** buffer for “last business day of quarter” rules once product defines policy.
4. Add a **regression case** in the eval harness that locks ob-06 to **Pass** after the change.
