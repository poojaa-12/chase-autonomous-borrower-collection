# Design document: Document collection engine (Chase)

## 1. Design goals

| Goal | Meaning |
|------|---------|
| **Reliability** | Processing is **atomic per step**: if an LLM call fails, the run can **resume** from the last persisted successful step. |
| **Traceability** | Every token spend and branch decision is tied to a **`run_id`** (and requirement / reply IDs as needed). |
| **Separation of concerns** | **Reasoning** (LLM), **orchestration** (Mastra workflow + router), and **storage** (Postgres via Drizzle) stay decoupled. |

---

## 2. Data model and state machine

The product is not “a script that runs once”; it **moves a requirement** through explicit states.

### 2.1 Schema strategy (Drizzle + relational core)

| Table | Purpose |
|-------|---------|
| `requirements` | What must be collected (e.g. Q3 financials) + expected `period_end`, entity, status. |
| `replies` | Raw borrower channel payload: upload metadata, email body, attachment refs. |
| `agent_runs` | One orchestration execution per reply (links to requirement, timestamps, overall outcome). |
| `audit_logs` | **Append-only** rows: step name, model, `prompt_version`, reasoning text, confidence, cost, optional artifact URL. |

Logical shape of each audit row matches **`AuditEntry`** in [ARCHITECTURE.md](ARCHITECTURE.md).

### 2.2 State transitions

| State | Description |
|-------|-------------|
| `PENDING` | Requirement created; initial outreach recorded (email mocked in prototype). |
| `RECEIVED` | Borrower reply queued (file / message persisted). |
| `PROCESSING` | Mastra workflow running (classify → route → extract or communicate). |
| `VALIDATED` | Classifier + temporal check passed; extractor may run or have completed. |
| `FOLLOW_UP_REQUIRED` | Wrong period, partial doc, or other **fixable** gap — communicator drafts next message. |
| `NEEDS_HUMAN_REVIEW` | Confidence below threshold or ambiguous outcome; **no silent ingest** (see guardrails). |
| `COMPLETED` | Accepted data persisted; officer notified (channel mocked in prototype). |

---

## 3. Agentic execution pattern

### 3.1 Async boundary (Next.js / Vercel)

Avoid blocking HTTP on long agent chains:

- **Ingestion:** e.g. `POST /api/borrower-reply` — persist reply, enqueue work (**Inngest**, queue, or Mastra-supported worker).
- **Workflow:** Classifier → **Router** → Extractor *or* Communicator *or* Escalator; each step writes **`audit_logs`** before the next begins.

### 3.2 Step outline

| Step | Responsibility |
|------|----------------|
| **A — Classifier** | Temporal match, doc type, entity hints; outputs structured verdict + confidence. |
| **B — Router** | Deterministic: VALID → C; INVALID → D; LOW_CONFIDENCE → review/escalate per policy. |
| **C — Extractor** | Strict **JSON** / Zod-shaped financial fields. |
| **D — Communicator** | Follow-up or rejection copy for borrower. |

### 3.3 Real-time UI

Frontend subscribes to **`audit_logs`** (e.g. **SSE** or polling) for a “live reasoning” feel on the lending dashboard.

---

## 4. Infrastructure and scaling

| Layer | Choice |
|-------|--------|
| **Compute** | Vercel for web + API; **long-running** steps on a worker pattern (not a single 10s serverless assumption for the whole chain). |
| **Database** | Neon Postgres; read replica optional for **audit-heavy** dashboard reads. |
| **Blob storage** | S3 or Vercel Blob; store **`artifact_url`** on the audit row so reviewers open the **exact** bytes the model saw. |

---

## 5. Safety layer (guardrails)

| Guardrail | Behavior |
|-----------|----------|
| **Confidence** | If `confidence < 0.85` (tunable), **rollback** ingest transaction and set `NEEDS_HUMAN_REVIEW` (or escalate per policy). |
| **Token budget** | Cap classifier “reasoning” tokens (e.g. **500**); if no verdict, **force escalate** — avoids runaway cost and infinite loops. |
| **Schema enforcement** | Extractor uses **Zod**; invalid JSON → **one** structured retry with Zod error text in context. |

---

## 6. Technical debt and intentional trade-offs

| Item | Prototype | Production direction |
|------|-----------|----------------------|
| **Email** | `sendEmail()` mocked | SendGrid / SES, templates, idempotency keys. |
| **OCR / PDF** | e.g. `pdf-parse` (CPU-heavy, in-process) | Dedicated worker or **Textract** / similar for large files. |

### Product UX note

**Scenario picker / simulation console:** expose the **raw JSON** (or normalized payload) sent into the agent alongside buttons — reads as an **engine**, not only a marketing site.

---

## Related documents

- System split and temporal check: [ARCHITECTURE.md](ARCHITECTURE.md)  
- README / evals / roadmap: [README.md](README.md)  
- Build order and acceptance tests: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
