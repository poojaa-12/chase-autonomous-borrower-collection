"use client";

import { FormEvent, useMemo, useState } from "react";

type AuditRow = {
  id: string;
  step: string;
  promptVersion: string;
  model: string;
  confidence: string;
  reasoning: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

const starterText = `ACME CORP Q3 financial statements
For the quarter ended September 30, 2025
Revenue: 1,000,000
EBITDA: 250,000
Net Income: 120,000`;

export function RunConsole() {
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    borrowerId: "borrower-demo-001",
    legalEntity: "ACME Corporation",
    docType: "Q3 Financials",
    expectedPeriodEnd: "2025-09-30",
    attachmentName: "acme_q3_financials.pdf",
    extractedText: starterText
  });

  const timeline = useMemo(
    () => rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [rows]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const res = await fetch("/api/borrower-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = (await res.json()) as {
        runId?: string;
        requirementId?: string;
        error?: string;
      };
      if (!res.ok || !payload.runId) {
        throw new Error(payload.error ?? "Failed to create run");
      }
      setRunId(payload.runId);
      setRequirementId(payload.requirementId ?? null);

      const snapshot = await fetch(`/api/runs/${payload.runId}`).then((r) => r.json());
      setRows(snapshot.logs ?? []);

      const stream = new EventSource(`/api/runs/${payload.runId}/events`);
      stream.addEventListener("audit", (evt) => {
        const row = JSON.parse((evt as MessageEvent).data) as AuditRow;
        setRows((prev) => {
          if (prev.some((item) => item.id === row.id)) return prev;
          return [...prev, row];
        });
      });
      stream.onerror = () => {
        stream.close();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card grid" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>Simulation Console</h2>
        <input
          value={form.borrowerId}
          onChange={(e) => setForm((s) => ({ ...s, borrowerId: e.target.value }))}
          placeholder="Borrower ID"
        />
        <input
          value={form.legalEntity}
          onChange={(e) => setForm((s) => ({ ...s, legalEntity: e.target.value }))}
          placeholder="Legal Entity"
        />
        <input
          value={form.expectedPeriodEnd}
          onChange={(e) =>
            setForm((s) => ({ ...s, expectedPeriodEnd: e.target.value }))
          }
          placeholder="Expected Period End (YYYY-MM-DD)"
        />
        <textarea
          rows={8}
          value={form.extractedText}
          onChange={(e) => setForm((s) => ({ ...s, extractedText: e.target.value }))}
        />
        <button disabled={loading} type="submit">
          {loading ? "Submitting..." : "Run workflow"}
        </button>
      </form>

      {(runId || error) && (
        <div className="card">
          {runId && (
            <p>
              <strong>Run ID:</strong> {runId}
              <br />
              <strong>Requirement ID:</strong> {requirementId}
            </p>
          )}
          {error && <p style={{ color: "#ff8080" }}>{error}</p>}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Audit stream</h3>
        {timeline.length === 0 ? (
          <p>No audit rows yet.</p>
        ) : (
          <div className="grid">
            {timeline.map((row) => (
              <div
                key={row.id}
                style={{
                  border: "1px solid #2a3558",
                  borderRadius: 8,
                  padding: "0.75rem"
                }}
              >
                <strong>{row.step}</strong> · {row.model} · confidence {row.confidence}
                <p style={{ marginBottom: "0.35rem" }}>{row.reasoning}</p>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontSize: "0.8rem",
                    color: "#c7d3ff"
                  }}
                >
                  {JSON.stringify(row.metadata ?? {}, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
