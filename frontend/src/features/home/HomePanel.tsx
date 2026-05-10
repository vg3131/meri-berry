import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getHomeStats, getCsvUrl } from "../../api/farmApi";
import { type HomeStatsResponse, type PeriodStats } from "../../types/farm";

type Period = "daily" | "weekly" | "monthly";

const PURPLE = "#9f52e2";
const TEAL = "#3ab0a0";

function amd(amount: number) {
  return `֏${amount.toLocaleString()}`;
}

function SummaryStrip({ stats }: { stats: PeriodStats }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}
    >
      {[
        { label: "Total Weight", value: `${stats.totalWeightKg.toFixed(2)} kg` },
        { label: "Total Earned", value: amd(stats.totalEarnedAmd) },
        { label: "Weigh-ins", value: stats.weighInCount.toString() },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            background: "#ffffff",
            border: "1px solid #e0e0ea",
            borderRadius: "0.55rem",
            padding: "0.75rem 1rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#596477", fontWeight: 600, marginBottom: "0.2rem" }}>
            {item.label}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#283143" }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

type ChartRow = {
  name: string;
  "Weight (kg)": number;
  "Earned (֏)": number;
};

function buildChartData(stats: PeriodStats): ChartRow[] {
  return stats.byFruitType.map((ft) => ({
    name: ft.fruitType,
    "Weight (kg)": ft.weightKg,
    "Earned (֏)": ft.earnedAmd,
  }));
}

// Custom tooltip for the chart
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #d8d8df",
        borderRadius: "0.45rem",
        padding: "0.6rem 0.9rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <p style={{ margin: "0 0 0.4rem", fontWeight: 700, color: "#424b5a" }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ margin: "0.15rem 0", color: entry.color, fontWeight: 600, fontSize: "0.88rem" }}>
          {entry.name}:{" "}
          {entry.name.startsWith("Earned")
            ? amd(entry.value)
            : `${entry.value.toFixed(3)} kg`}
        </p>
      ))}
    </div>
  );
}

export function HomePanel() {
  const [stats, setStats] = useState<HomeStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period>("daily");

  // Compute date-range boundaries for the active period
  const dateRangeForPeriod = (period: Period): { from: string; to: string; label: string } => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (period === "daily") {
      return { from: todayStr, to: todayStr, label: "Export Today's CSV" };
    }

    if (period === "weekly") {
      const dayOfWeek = now.getUTCDay(); // 0=Sun
      const daysFromMonday = (dayOfWeek + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
      const from = weekStart.toISOString().slice(0, 10);
      return { from, to: todayStr, label: "Export This Week's CSV" };
    }

    // monthly
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = monthStart.toISOString().slice(0, 10);
    return { from, to: todayStr, label: "Export This Month's CSV" };
  };

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
  const chartData = currentStats ? buildChartData(currentStats) : [];
  const hasData = chartData.length > 0;

  return (
    <section className="panel">
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Farm Overview</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(() => {
            const { from, to, label } = dateRangeForPeriod(activePeriod);
            return (
              <a
                href={getCsvUrl(from, to)}
                className="btn btn-secondary"
                style={{ textDecoration: "none", fontSize: "0.85rem" }}
                download
              >
                {label}
              </a>
            );
          })()}
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

      {/* Period toggle */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setActivePeriod(p.key)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "0.4rem",
              border: "1px solid",
              borderColor: activePeriod === p.key ? PURPLE : "#c8ccda",
              background: activePeriod === p.key ? PURPLE : "#ffffff",
              color: activePeriod === p.key ? "#ffffff" : "#475264",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="status status-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && <p style={{ color: "#596477" }}>Loading stats…</p>}

      {/* Content */}
      {!isLoading && currentStats && (
        <>
          <SummaryStrip stats={currentStats} />

          {!hasData ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 0",
                color: "#8a93a6",
                background: "#f9f9fc",
                borderRadius: "0.55rem",
                border: "1px dashed #d8d8df",
              }}
            >
              <p style={{ margin: 0, fontSize: "1rem" }}>No weigh-ins recorded for this period.</p>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem" }}>
                Head to <strong>Weigh Product</strong> to record some pickings.
              </p>
            </div>
          ) : (
            <div>
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.85rem",
                  color: "#596477",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                By Fruit Type
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  barCategoryGap="28%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#596477", fontSize: 13, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="weight"
                    orientation="left"
                    tick={{ fill: "#596477", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} kg`}
                    width={70}
                  />
                  <YAxis
                    yAxisId="amd"
                    orientation="right"
                    tick={{ fill: "#596477", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `֏${v.toLocaleString()}`}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(159,82,226,0.06)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: "0.85rem", paddingTop: "0.75rem" }}
                    iconType="circle"
                    iconSize={10}
                  />
                  <Bar
                    yAxisId="weight"
                    dataKey="Weight (kg)"
                    fill={TEAL}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                  <Bar
                    yAxisId="amd"
                    dataKey="Earned (֏)"
                    fill={PURPLE}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}
