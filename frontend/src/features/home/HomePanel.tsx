import { useState, useEffect } from "react";
import { getHomeStats, getDailyCsvUrl } from "../../api/farmApi";
import { type HomeStatsResponse, type PeriodStats } from "../../types/farm";

function amd(amount: number) {
  return `֏${amount.toLocaleString()}`;
}

type Period = "daily" | "weekly" | "monthly";

function PeriodStatsCard({ stats }: { stats: PeriodStats }) {
  if (stats.weighInCount === 0) {
    return <p style={{ color: "#596477", margin: 0 }}>No data recorded for this period.</p>;
  }

  return (
    <div>
      <div className="result-stack" style={{ marginBottom: "1rem" }}>
        <div className="result-card">
          <dl className="result-grid">
            <dt>Total Weight (kg)</dt>
            <dd>{stats.totalWeightKg.toFixed(3)}</dd>
            <dt>Total Earned</dt>
            <dd>{amd(stats.totalEarnedAmd)}</dd>
            <dt>Weigh-in Count</dt>
            <dd>{stats.weighInCount}</dd>
          </dl>
        </div>
      </div>

      {stats.byFruitType.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Fruit Type</th>
                <th>Weight (kg)</th>
                <th>Earned</th>
                <th>Weigh-ins</th>
              </tr>
            </thead>
            <tbody>
              {stats.byFruitType.map((ft, idx) => (
                <tr key={ft.fruitType} className={idx % 2 === 0 ? "row-even" : ""}>
                  <td style={{ fontWeight: 600 }}>{ft.fruitType}</td>
                  <td>{ft.weightKg.toFixed(3)}</td>
                  <td>{amd(ft.earnedAmd)}</td>
                  <td>{ft.weighInCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HomePanel() {
  const [stats, setStats] = useState<HomeStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period>("daily");

  const todayStr = new Date().toISOString().slice(0, 10);

  const load = () => {
    setIsLoading(true);
    setError(null);
    getHomeStats()
      .then(setStats)
      .catch(() => setError("Failed to load stats."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const periods: Array<{ key: Period; label: string }> = [
    { key: "daily", label: "Today" },
    { key: "weekly", label: "This Week" },
    { key: "monthly", label: "This Month" },
  ];

  const currentStats = stats?.[activePeriod];

  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Farm Overview</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={getDailyCsvUrl(todayStr)}
            className="btn btn-secondary"
            style={{ textDecoration: "none", fontSize: "0.85rem" }}
            download
          >
            Export Today's CSV
          </a>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem" }}
            onClick={load}
            disabled={isLoading}
          >
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.1rem" }}>
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setActivePeriod(p.key)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "0.4rem",
              border: "1px solid",
              borderColor: activePeriod === p.key ? "#9f52e2" : "#c8ccda",
              background: activePeriod === p.key ? "#9f52e2" : "#ffffff",
              color: activePeriod === p.key ? "#ffffff" : "#475264",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="status status-error">
          <p>{error}</p>
        </div>
      )}

      {isLoading && <p style={{ color: "#596477" }}>Loading stats…</p>}

      {!isLoading && currentStats && (
        <PeriodStatsCard stats={currentStats} />
      )}
    </section>
  );
}
