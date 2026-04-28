# Chase: Autonomous Borrower Document Collection

**Codename:** chase  
**Target role:** Founding Engineer @ Proximitty  
**Author:** Sai Pooja Sabbani (MS CS @ UF)

> The bottleneck in commercial lending isn't the credit decision — it's the weeks of back-and-forth collecting borrower documents, where a meaningful share arrive in the wrong format, the wrong period, or unreadable at all.

**Live app:** [chase.poojas.dev](https://chase.poojas.dev)  
**Loom (90s):** [Link placeholder]  
**Stack:** Mastra · Claude Sonnet 4.5 · Next.js 15 · Drizzle + Neon · Vercel

**Technical deep-dives:** [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_DOC.md](DESIGN_DOC.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

---

## The hardest case (why the design centers on it)

The **wrong-period** scenario is what breaks naive document-collection agents: the borrower labels something “Q3 financials,” but the cover page says **period ending June 30**. A shallow pipeline ingests it; a careful classifier catches the mismatch, refuses ingest, and drafts a polite follow-up. Most of this prototype is shaped around getting that case right.

---

## For the CTO (Zi): traceability and regressions

Every agent action is **human-readable, replayable, and challengeable**.

| Concern | How Chase addresses it |
|--------|-------------------------|
| **Traceability** | Each call writes an **audit row** (CoT-style reasoning, latency, **$/run**). |
| **Prompt versioning** | Every agent call is tagged with **`prompt_version`** so evals can catch regressions. |
| **Branching** | A **multi-agent Mastra workflow** keeps routing explicit instead of relying on one mega-prompt. |

---

## For the credit officer (Wye Yew): co-pilot, not black box

Chase is a **co-pilot for relationship managers**, not an opaque scorer.

- **Transparency:** Wrong covenant call? See **why** in a few clicks and **override** without code.
- **Tone:** Automated follow-ups match **firm, professional, context-aware** RM language.

---

## Evals and performance

Golden set: **8** difficult borrower submissions. Failure analysis (e.g. **ob-06**): [evals/LOGS.md](evals/LOGS.md).

| Case ID | Scenario | Expected action | Status | Confidence |
|---------|----------|-----------------|--------|------------|
| hp-01 | Correct Q3 PDF | Ingest | Pass | 0.98 |
| wp-02 | Q2 sent for Q3 | Follow-up | Pass | 0.94 |
| pe-03 | Wrong legal entity | Escalate | Pass | 0.91 |
| pd-04 | Partial (financials only) | Partial ingest | Pass | 0.89 |
| un-05 | Low-res phone photo | Escalate | Pass | 0.96 |
| ob-06 | Off-by-one day on period end | Follow-up | **Fail** | 0.65 |
| ur-07 | Unrelated document | Escalate | Pass | 0.97 |
| sc-08 | Correct Excel file | Ingest | Pass | 0.93 |

**Accuracy:** 7/8 (87.5%). **ob-06:** See [evals/LOGS.md](evals/LOGS.md); **planned fix:** deterministic date normalization / fuzzy window **before** the LLM sees raw text ([ARCHITECTURE.md](ARCHITECTURE.md) §3, [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) M4).

---

## Roadmap

1. **Confidence-based routing:** Auto-ingest above **0.95**, human review **0.7–0.95**, auto-escalate below **0.7**.
2. **Multi-entity disambiguation:** Umbrella borrowers with distinct legal entities.
3. **Examiner-grade explainers:** “Reasoning summary” artifact for regulators.

---

## Local setup (working MVP)

1. Copy env template: `cp .env.example .env.local`.
2. Set required variables:
   - `DATABASE_URL` (Neon/Postgres)
   - `ANTHROPIC_API_KEY` (optional; deterministic fallback works without it)
3. Install deps: `npm install`.
4. Generate migration: `npm run db:generate`.
5. Apply schema to DB: `npm run db:push`.
6. Start app: `npm run dev`.
7. In a second terminal, start Inngest dev server: `npm run inngest:dev`.

Then open `http://localhost:3000`, submit the simulation form, and watch live `audit_logs` stream from `/api/runs/:id/events`.

---

## Quality gates (simulation-first hardening)

- Run static checks: `npm run lint` and `npm run typecheck`
- Run tests with coverage: `npm run test`
- Run full local CI gate: `npm run ci`

Current test focus:
- Routing decisions (`src/agents/router.test.ts`)
- Temporal utilities (`src/lib/temporal.test.ts`)
- API handler behavior with mocked dependencies (`src/app/api/borrower-reply/route.test.ts`, `src/app/api/runs/[id]/route.test.ts`)
- Agent fallbacks and messaging (`src/agents/classifier.test.ts`, `src/agents/extractor.test.ts`, `src/agents/communicator.test.ts`, `src/agents/escalator.test.ts`)
- Audit/state write helpers (`src/lib/audit.test.ts`)
- Runtime readiness guard (`src/lib/runtime-readiness.test.ts`)

CI hardening:
- GitHub Actions runs Node **20** and **22** for lint/type/test/build.
- Coverage HTML report is uploaded as a CI artifact on Node 22.
- CI uses workflow concurrency cancellation for faster feedback on active branches.

---

## Docker deployment hardening

- Build container locally: `npm run docker:build`
- Run container:
  - `docker run --rm -p 3000:3000 -e DATABASE_URL=<your-db-url> -e ANTHROPIC_API_KEY=<your-key> chase:local`
- Health endpoint used by container probe: `/api/health`
- Health returns HTTP `503` when critical runtime env (currently `DATABASE_URL`) is missing.

The image is built from a multi-stage `Dockerfile` using Next.js standalone output and a non-root runtime user.

---

## Contact

**Sai Pooja Sabbani** — MS Computer Science, University of Florida (graduating May 2026)  
F-1 (STEM OPT eligible)

Built in **four days** because the wrong-period failure mode kept nagging — it looks easy from the outside and breaks naive systems. Happy to walk through design tradeoffs.
