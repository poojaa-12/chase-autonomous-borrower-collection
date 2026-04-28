# Architecture: Project Chase

## 1. Technical philosophy

Chase is an **agentic orchestration** system for high-stakes financial documents. It models document collection as a **finite state machine (FSM)** whose transitions are driven by **LLM-assisted classification and validation**, not a flat list of hard-coded rules.

---

## 2. Component design (multi-agent split)

Granularity is intentional: **each agent maps to one audit step** so compliance and engineering can replay decisions.

| Agent | Role |
|-------|------|
| **Classifier** | Primary **reasoning gate**: document type, entity hints, **temporal validity** vs requirement. |
| **Router** | **Deterministic** branch after classifier output (valid → extract; invalid → communicate; low confidence → human / escalate). |
| **Extractor** | Structured extraction / OCR-backed parsing **only after** validity is accepted. |
| **Follow-up (Communicator)** | Borrower-facing copy: polite, specific asks (wrong period, partial packet, etc.). |
| **Escalator** | Human handoff: crisp summary of **what failed**, **what was tried**, and **what the RM should do next**. |

*Design doc note:* The database may store one row per step under a table name like `audit_logs`; the **logical record** is still the **`AuditEntry` shape** (see below) keyed by `run_id`.

---

## 3. Temporal validation (“wrong-period” check)

Core differentiator: **don’t ingest** when the document’s stated period does not match the **requirement’s expected `period_end`**.

1. **Requirement lookup** — Load expected `period_end` (e.g. `2025-09-30`).
2. **Visual / text parsing** — Prefer first ~2 pages; surface phrases like *Period ending*, *For the quarter ended*, *As of*.
3. **Heuristic comparison** — If parsed end date is outside a **±2 day** buffer vs expected, branch to **follow-up** (not ingest).  
   **Planned hardening:** Normalize fiscal vs calendar labels and run a **deterministic date layer** before the LLM (addresses **ob-06** / off-by-one near quarter boundaries).

---

## 4. Observability schema

Append-only audit storage: one row per agent step, queryable by **run**, **requirement**, and **prompt_version**.

```typescript
// Logical audit record (stored e.g. in audit_logs or audit_entries)
type AuditEntry = {
  step: "classification" | "extraction" | "communication" | "escalation";
  prompt_version: string;
  model: "claude-3-5-sonnet" | "claude-4-5-sonnet" | string;
  reasoning: string;
  confidence: number; // 0..1
  cost_usd: number;
  latency_ms?: number;
  run_id: string;
};
```

Align field names with Drizzle in implementation; the **contract** is: immutable append, **no cross-run borrower leakage**, and **prompt_version** on every LLM call.

---

## 5. Security and compliance

- **Context isolation** — Each document run is scoped; no mixing borrower A’s files into borrower B’s thread.
- **Human-readable logs** — UI surfaces **reasoning + confidence + cost** for non-engineering reviewers.

---

## 6. Interview framing (ob-06)

The **off-by-one day** eval is a feature, not a footgun: when asked *why it failed*, answer with diagnosis and next step — e.g. *Sept 29 vs Sept 30 boundary confusion; adding a fuzzy-date / normalization preprocessor before the LLM sees raw PDF text.*

For execution order and milestones, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
