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
          <span>Worker Number</span>
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
              <dt>Worker Number</dt>
              <dd>{summaryResult.worker.workerNumber}</dd>
              <dt>Name</dt>
              <dd>{summaryResult.worker.name}</dd>
              <dt>Active</dt>
              <dd>{String(summaryResult.worker.active)}</dd>
              <dt>Created At</dt>
              <dd>{summaryResult.worker.createdAt}</dd>
            </dl>
          </section>

          <section className="result-card">
            <h3>Summary</h3>
            <dl className="result-grid">
              <dt>Total Weight Grams</dt>
              <dd>{summaryResult.summary.totalWeightGrams}</dd>
              <dt>Total Weight Kg</dt>
              <dd>{summaryResult.summary.totalWeightKg}</dd>
              <dt>Total Earned Cents</dt>
              <dd>{summaryResult.summary.totalEarnedCents}</dd>
              <dt>Total Paid Cents</dt>
              <dd>{summaryResult.summary.totalPaidCents}</dd>
              <dt>Outstanding Cents</dt>
              <dd>{summaryResult.summary.outstandingCents}</dd>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}
