import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getDailyWeighIns, getHomeStats } from "../db/queries";
import { gramsToKg } from "../utils/math";

type CsvQuery = {
  date?: string;
  from?: string;
  to?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string | undefined): s is string {
  return typeof s === "string" && DATE_RE.test(s);
}

function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

async function sendDailyCsv(
  request: FastifyRequest<{ Querystring: CsvQuery }>,
  reply: FastifyReply,
) {
  const { date, from, to } = request.query;

  let fromIso: string;
  let toIso: string;
  let filename: string;

  if (isValidDate(date)) {
    // Single-day mode: ?date=YYYY-MM-DD
    fromIso = startOfDayIso(date);
    toIso = endOfDayIso(date);
    filename = `daily-${date}.csv`;
  } else if (isValidDate(from) && isValidDate(to)) {
    // Range mode: ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
    fromIso = startOfDayIso(from);
    toIso = endOfDayIso(to);
    filename = `export-${from}-to-${to}.csv`;
  } else {
    return reply.code(400).send({
      message: "Provide either ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD",
    });
  }

  const rows = getDailyWeighIns(fromIso, toIso);

  const header = "date,workerNumber,workerName,fruitType,weightKg,earnedAmd";
  const lines = rows.map((r) => {
    const kg = gramsToKg(r.weightGrams).toFixed(3);
    const rowDate = r.recordedAt.slice(0, 10);
    const fruitType = (r.fruitTypeName ?? "Unknown").replace(/,/g, ";");
    const name = r.workerName.replace(/,/g, ";");
    return `${rowDate},${r.workerNumber},${name},${fruitType},${kg},${r.earnedCents}`;
  });

  const csv = [header, ...lines].join("\n");

  return reply
    .code(200)
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
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
  app.get<{ Querystring: CsvQuery }>("/reports/daily.csv", sendDailyCsv);
  app.get<{ Querystring: HomeStatsQuery }>("/reports/home-stats", sendHomeStats);
}
