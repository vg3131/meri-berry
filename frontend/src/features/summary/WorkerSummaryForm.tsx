import { useState, type FormEvent } from "react";
import { ApiRequestError } from "../../api/api";
import { type WorkerSummaryView } from "../../types/farm";

type WorkerSummaryFormProps = {
  onSearchWorkerSummary: (workerNumber: string) => Promise<WorkerSummaryView>;
};

function mapWorkerSummaryError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return "Worker not found.";
    }
    if (error.status === 400) {
      return "Invalid request.";
    }
    if (error.status === 500) {
      return "Server error / no rate configured.";
    }
    return error.message;
  }

  return "Unexpected error while loading summary.";
}

export function WorkerSummaryForm({ onSearchWorkerSummary }: WorkerSummaryFormProps) {
  const [summaryWorkerNumber, setSummaryWorkerNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryResult, setSummaryResult] = useState<WorkerSummaryView | null>(null);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const workerNumber = summaryWorkerNumber.trim();

    if (!workerNumber) {
      setSummaryError("Worker number is required.");
      setSummaryResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSearchWorkerSummary(workerNumber);
      setSummaryResult(result);
      setSummaryError("");
    } catch (error) {
      setSummaryResult(null);
      setSummaryError(mapWorkerSummaryError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setSummaryWorkerNumber("");
    setSummaryError("");
    setSummaryResult(null);
  };

  return (
    <section className="panel">
      <h2>Worker Summary Form</h2>
      <form className="form-grid" onSubmit={handleSearch}>
        <label className="field">
          <span>workerNumber</span>
          <input
            type="text"
            value={summaryWorkerNumber}
            onChange={(event) => setSummaryWorkerNumber(event.target.value)}
            placeholder="e.g. 101"
            required
          />
        </label>

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearForm}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      </form>

      {summaryError && (
        <div className="status status-error">
          <p>{summaryError}</p>
        </div>
      )}

      {summaryResult && (
        <div className="result-stack">
          <section className="result-card">
            <h3>Worker</h3>
            <dl className="result-grid">
              <dt>workerNumber</dt>
              <dd>{summaryResult.worker.workerNumber}</dd>
              <dt>name</dt>
              <dd>{summaryResult.worker.name}</dd>
              <dt>active</dt>
              <dd>{String(summaryResult.worker.active)}</dd>
              <dt>createdAt</dt>
              <dd>{summaryResult.worker.createdAt}</dd>
            </dl>
          </section>

          <section className="result-card">
            <h3>Summary</h3>
            <dl className="result-grid">
              <dt>Total Weight (g)</dt>
              <dd>{summaryResult.summary.totalWeightGrams.toLocaleString()}</dd>
              <dt>Total Weight (kg)</dt>
              <dd>{summaryResult.summary.totalWeightKg.toLocaleString()}</dd>
              <dt>Total Earned</dt>
              <dd>֏{summaryResult.summary.totalEarnedCents.toLocaleString()}</dd>
              <dt>Total Paid</dt>
              <dd>֏{summaryResult.summary.totalPaidCents.toLocaleString()}</dd>
              <dt>Outstanding</dt>
              <dd style={{ color: summaryResult.summary.outstandingCents > 0 ? "#9f52e2" : undefined, fontWeight: 700 }}>
                ֏{summaryResult.summary.outstandingCents.toLocaleString()}
              </dd>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}
