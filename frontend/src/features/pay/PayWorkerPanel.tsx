import { useState, type FormEvent } from "react";
import { ApiRequestError } from "../../api/api";
import { getWorkerSummary, payWorker } from "../../api/farmApi";
import { type PayWorkerResponse, type WorkerSummaryResponse } from "../../types/farm";

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "preview"; summary: WorkerSummaryResponse }
  | { kind: "paying"; summary: WorkerSummaryResponse }
  | { kind: "paid"; result: PayWorkerResponse }
  | { kind: "error"; message: string };

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function mapError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) return "Worker not found.";
    if (error.status === 422) return "Worker has no outstanding balance to pay.";
    if (error.status === 400) return "Invalid request.";
    if (error.status === 500) return "Server error.";
    return error.message;
  }
  return "Unexpected error.";
}

export function PayWorkerPanel() {
  const [workerNumber, setWorkerNumber] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wn = workerNumber.trim();
    if (!wn) return;

    setPhase({ kind: "loading" });
    try {
      const summary = await getWorkerSummary(wn);
      setPhase({ kind: "preview", summary });
    } catch (error) {
      setPhase({ kind: "error", message: mapError(error) });
    }
  };

  const handlePay = async () => {
    if (phase.kind !== "preview") return;
    const wn = workerNumber.trim();

    setPhase({ kind: "paying", summary: phase.summary });
    try {
      const result = await payWorker(wn);
      setPhase({ kind: "paid", result });
    } catch (error) {
      setPhase({ kind: "error", message: mapError(error) });
    }
  };

  const handleReset = () => {
    setWorkerNumber("");
    setPhase({ kind: "idle" });
  };

  const isLooking = phase.kind === "loading";
  const isPaying = phase.kind === "paying";
  const isBusy = isLooking || isPaying;

  const previewSummary =
    phase.kind === "preview" || phase.kind === "paying" ? phase.summary : null;

  return (
    <section className="panel">
      <h2>Pay Worker</h2>

      <form className="form-grid" onSubmit={handleLookup}>
        <label className="field">
          <span>workerNumber</span>
          <input
            type="text"
            value={workerNumber}
            onChange={(e) => {
              setWorkerNumber(e.target.value);
              if (phase.kind !== "idle") setPhase({ kind: "idle" });
            }}
            placeholder="e.g. 101"
            required
            disabled={isBusy}
          />
        </label>

        <div className="button-row" style={{ alignItems: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={isBusy}>
            {isLooking ? "Looking up..." : "Look Up"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isBusy}
          >
            Clear
          </button>
        </div>
      </form>

      {phase.kind === "error" && (
        <div className="status status-error" style={{ marginTop: "1rem" }}>
          <p>{phase.message}</p>
        </div>
      )}

      {previewSummary && (
        <div className="result-stack" style={{ marginTop: "1rem" }}>
          <section className="result-card">
            <h3>Worker</h3>
            <dl className="result-grid">
              <dt>workerNumber</dt>
              <dd>{previewSummary.worker.workerNumber}</dd>
              <dt>name</dt>
              <dd>{previewSummary.worker.name}</dd>
            </dl>
          </section>

          <section className="result-card">
            <h3>Outstanding Balance</h3>
            <dl className="result-grid">
              <dt>totalEarned</dt>
              <dd>{centsToDisplay(previewSummary.summary.totalEarnedCents)}</dd>
              <dt>totalPaid</dt>
              <dd>{centsToDisplay(previewSummary.summary.totalPaidCents)}</dd>
              <dt>outstanding</dt>
              <dd
                style={{
                  color: previewSummary.summary.outstandingCents > 0 ? "#9f52e2" : undefined,
                  fontWeight: 700,
                }}
              >
                {centsToDisplay(previewSummary.summary.outstandingCents)}
              </dd>
            </dl>
          </section>

          <div className="button-row" style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePay}
              disabled={isPaying || previewSummary.summary.outstandingCents === 0}
            >
              {isPaying
                ? "Processing..."
                : previewSummary.summary.outstandingCents === 0
                  ? "Nothing to Pay"
                  : `Pay ${centsToDisplay(previewSummary.summary.outstandingCents)}`}
            </button>
          </div>
        </div>
      )}

      {phase.kind === "paid" && (
        <div style={{ marginTop: "1rem" }}>
          <div
            className="status"
            style={{
              background: "#f0faf3",
              border: "1px solid #9fcfae",
              color: "#1e5c33",
              marginBottom: "1rem",
            }}
          >
            <p>
              Payment of{" "}
              <strong>{centsToDisplay(phase.result.payment.amountCents)}</strong> recorded
              for worker <strong>{phase.result.payment.workerNumber}</strong>.
            </p>
          </div>

          <div className="result-stack">
            <section className="result-card">
              <h3>Updated Summary</h3>
              <dl className="result-grid">
                <dt>totalEarned</dt>
                <dd>{centsToDisplay(phase.result.summary.totalEarnedCents)}</dd>
                <dt>totalPaid</dt>
                <dd>{centsToDisplay(phase.result.summary.totalPaidCents)}</dd>
                <dt>outstanding</dt>
                <dd style={{ fontWeight: 700 }}>
                  {centsToDisplay(phase.result.summary.outstandingCents)}
                </dd>
              </dl>
            </section>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Pay Another Worker
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
