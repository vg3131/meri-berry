import { useState, useEffect } from "react";
import { getWorkersOutstanding, payWorker } from "../../api/farmApi";
import { type OutstandingWorker } from "../../types/farm";

function amd(cents: number) {
  return `֏${cents.toLocaleString()}`;
}

export function OutstandingPanel() {
  const [workers, setWorkers] = useState<OutstandingWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingWorker, setPayingWorker] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getWorkersOutstanding()
      .then((res) => { if (!cancelled) { setWorkers(res.workers); setIsLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Failed to load outstanding workers."); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handlePay = async (workerNumber: string, name: string) => {
    setPayingWorker(workerNumber);
    setPaySuccess(null);
    setError(null);
    try {
      await payWorker(workerNumber);
      setPaySuccess(`Paid ${name} successfully.`);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(`Failed to pay worker ${workerNumber}.`);
    } finally {
      setPayingWorker(null);
    }
  };

  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Outstanding Balances</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => { setIsLoading(true); setError(null); setRefreshKey((k) => k + 1); }}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="status status-error" style={{ marginBottom: "1rem" }}>
          <p>{error}</p>
        </div>
      )}

      {paySuccess && (
        <div className="status" style={{ marginBottom: "1rem", background: "#f0faf4", border: "1px solid #a3d9b1", color: "#1e6a3a" }}>
          <p>{paySuccess}</p>
        </div>
      )}

      {!isLoading && workers.length === 0 && !error && (
        <p style={{ color: "#596477" }}>No workers have an outstanding balance.</p>
      )}

      {workers.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Weight (kg)</th>
                <th>Earned</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, idx) => (
                <tr key={w.workerNumber} className={idx % 2 === 0 ? "row-even" : ""}>
                  <td>{w.workerNumber}</td>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td>{w.totalWeightKg.toFixed(3)}</td>
                  <td>{amd(w.totalEarnedCents)}</td>
                  <td>{amd(w.totalPaidCents)}</td>
                  <td style={{ fontWeight: 700, color: "#9f52e2" }}>{amd(w.outstandingCents)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
                      disabled={payingWorker === w.workerNumber}
                      onClick={() => handlePay(w.workerNumber, w.name)}
                    >
                      {payingWorker === w.workerNumber ? "Paying…" : "Pay Now"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
