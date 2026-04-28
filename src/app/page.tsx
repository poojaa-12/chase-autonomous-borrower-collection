import { RunConsole } from "@/components/run-console";

export default function HomePage() {
  return (
    <main>
      <h1>Chase Command Center</h1>
      <p>
        Submit borrower replies, trigger the workflow, and inspect live audit
        output for each run.
      </p>

      <div className="card">
        <strong>Docs</strong>
        <div className="grid" style={{ marginTop: "0.75rem" }}>
          <code>README.md</code>
          <code>ARCHITECTURE.md</code>
          <code>DESIGN_DOC.md</code>
          <code>IMPLEMENTATION_PLAN.md</code>
        </div>
      </div>

      <RunConsole />
    </main>
  );
}
