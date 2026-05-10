import { useState, type FormEvent } from "react";
import { ApiRequestError } from "../../api/api";
import { getWorkerLedger } from "../../api/farmApi";
import { type LedgerEntry, type WorkerLedgerResponse } from "../../types/farm";

function amd(cents: number) {
  return `֏${cents.toLocaleString()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapLedgerError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) return "Worker not found.";
    return error.message;
  }
  return "Unexpected error loading ledger.";
}

export function WorkerLedgerPanel() {
  const [workerNumber, setWorkerNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkerLedgerResponse | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const num = workerNumber.trim();
    if (!num) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getWorkerLedger(num);
      setResult(data);
    } catch (err) {
      setError(mapLedgerError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const clear = () => {
    setWorkerNumber("");
    setError(null);
    setResult(null);
  };

  return (
    <section className="panel">
      <h2>Worker Ledger</h2>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Worker Number</span>
          <input
            type="text"
            value={workerNumber}
            onChange={(e) => setWorkerNumber(e.target.value)}
            placeholder="e.g. 101"
            required
            disabled={isLoading}
          />
        </label>

        <div className="button-row" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Loading…" : "View Ledger"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clear}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="status status-error" style={{ marginTop: "1rem" }}>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1.25rem" }}>
          <p style={{ margin: "0 0 0.75rem", color: "#424b5a", fontWeight: 600 }}>
            {result.worker.name} — #{result.worker.workerNumber}
            {!result.worker.active && (
              <span style={{ marginLeft: "0.5rem", color: "#8c2d33", fontWeight: 400 }}>
                (inactive)
              </span>
            )}
          </p>

          {result.ledger.length === 0 ? (
            <p style={{ color: "#596477" }}>No transactions recorded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Fruit Type</th>
                    <th>Weight (kg)</th>
                    <th>Amount</th>
                    <th>Running Balance</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ledger.map((row: LedgerEntry, idx: number) => (
                    <tr key={`${row.type}-${row.id}`} className={idx % 2 === 0 ? "row-even" : ""}>
                      <td>{formatDate(row.occurredAt)}</td>
                      <td>
                        <span className={`ledger-badge ${row.type === "weigh_in" ? "badge-weigh" : "badge-payment"}`}>
                          {row.type === "weigh_in" ? "Weigh-in" : "Payment"}
                        </span>
                      </td>
                      <td>{row.fruitTypeName ?? "—"}</td>
                      <td>
                        {row.weightGrams != null
                          ? (row.weightGrams / 1000).toFixed(3)
                          : "—"}
                      </td>
                      <td style={{ color: row.type === "payment" ? "#8c2d33" : "#1e6a3a" }}>
                        {row.type === "payment" ? "−" : "+"}
                        {amd(row.amountCents)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{amd(row.runningOutstandingCents)}</td>
                      <td style={{ color: "#596477" }}>{row.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
