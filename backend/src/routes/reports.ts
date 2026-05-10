import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getDailyWeighIns, getHomeStats } from "../db/queries";
import { gramsToKg } from "../utils/math";

type DailyCsvQuery = {
  date?: string;
};

function isoDateFromParam(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return dateStr;
}

function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

async function sendDailyCsv(
  request: FastifyRequest<{ Querystring: DailyCsvQuery }>,
  reply: FastifyReply,
) {
  const dateParam = request.query.date;
  const date = isoDateFromParam(dateParam);

  if (!date) {
    return reply.code(400).send({ message: "Missing or invalid date param. Use ?date=YYYY-MM-DD" });
  }

  const rows = getDailyWeighIns(startOfDayIso(date), endOfDayIso(date));

  const header = "date,workerNumber,workerName,fruitType,weightKg,earnedAmd";
  const lines = rows.map((r) => {
    const kg = gramsToKg(r.weightGrams).toFixed(3);
    const fruitType = (r.fruitTypeName ?? "Unknown").replace(/,/g, ";");
    const name = r.workerName.replace(/,/g, ";");
    return `${date},${r.workerNumber},${name},${fruitType},${kg},${r.earnedCents}`;
  });

  const csv = [header, ...lines].join("\n");

  return reply
    .code(200)
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="daily-${date}.csv"`)
    .send(csv);
}

type HomeStatsQuery = {
  tz?: string;
};

async function sendHomeStats(
  request: FastifyRequest<{ Querystring: HomeStatsQuery }>,
  _reply: FastifyReply,
) {
  // Compute day / week / month boundaries in UTC
  const now = new Date();

  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  // ISO week: Monday = start of week
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = (dayOfWeek + 6) % 7; // 0=Mon
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [daily, weekly, monthly] = [
    getHomeStats(todayStart.toISOString(), tomorrowStart.toISOString()),
    getHomeStats(weekStart.toISOString(), weekEnd.toISOString()),
    getHomeStats(monthStart.toISOString(), monthEnd.toISOString()),
  ];

  function summarise(rows: ReturnType<typeof getHomeStats>) {
    return {
      totalWeightKg: Number((rows.reduce((s, r) => s + r.totalWeightGrams, 0) / 1000).toFixed(3)),
      totalEarnedAmd: rows.reduce((s, r) => s + r.totalEarnedCents, 0),
      weighInCount: rows.reduce((s, r) => s + r.weighInCount, 0),
      byFruitType: rows.map((r) => ({
        fruitType: r.fruitTypeName,
        weightKg: gramsToKg(r.totalWeightGrams),
        earnedAmd: r.totalEarnedCents,
        weighInCount: r.weighInCount,
      })),
    };
  }

  return {
    daily: summarise(daily),
    weekly: summarise(weekly),
    monthly: summarise(monthly),
  };
}

export async function reportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: DailyCsvQuery }>("/reports/daily.csv", sendDailyCsv);
  app.get<{ Querystring: HomeStatsQuery }>("/reports/home-stats", sendHomeStats);
}
