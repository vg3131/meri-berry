/**
 * Route integration tests.
 *
 * DATABASE_PATH=:memory: must be set in the environment (npm test does this).
 *
 * IMPORTANT: queries.ts calls db.prepare() at module load time, so the schema
 * must exist before that module is first required. We achieve this by using
 * lazy require() inside before() — migrations run first, then the app modules
 * are loaded, then db.prepare() runs against an already-populated DB.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";

function applyMigrations(db: { exec: (sql: string) => void }) {
  const migrationsDir = path.resolve(__dirname, "../db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
}

describe("Meri Berry API", () => {
  let app: FastifyInstance;

  before(async () => {
    // 1. Load DB client — creates in-memory DB (no tables yet)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { db } = require("../db/client") as typeof import("../db/client");

    // 2. Apply migrations — all tables now exist
    applyMigrations(db);

    // 3. Load app — queries.ts prepares statements against the populated DB
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildApp } = require("../app") as typeof import("../app");
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // ── Health ────────────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns 200 with status ok", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(res.body), { status: "ok" });
    });
  });

  // ── Fruit types ───────────────────────────────────────────────────────────

  describe("GET /api/fruit-types", () => {
    it("returns an array", async () => {
      const res = await app.inject({ method: "GET", url: "/api/fruit-types" });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(JSON.parse(res.body)));
    });
  });

  describe("POST /api/fruit-types", () => {
    it("creates a new fruit type and returns 201", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "Strawberry", amdPerKg: 350 },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.name, "Strawberry");
      assert.strictEqual(body.amdPerKg, 350);
      assert.ok(typeof body.id === "number");
    });

    it("returns 409 for a duplicate name", async () => {
      await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "Blueberry", amdPerKg: 500 },
      });
      const res = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "Blueberry", amdPerKg: 500 },
      });
      assert.strictEqual(res.statusCode, 409);
    });

    it("returns 400 when name is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { amdPerKg: 350 },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it("returns 400 when amdPerKg is zero or negative", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "BadRate", amdPerKg: 0 },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  // ── Workers ───────────────────────────────────────────────────────────────

  describe("GET /api/workers/:workerNumber", () => {
    it("returns 404 for an unknown worker", async () => {
      const res = await app.inject({ method: "GET", url: "/api/workers/9999" });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe("POST /api/workers/:workerNumber/payments", () => {
    it("returns 404 for an unknown worker", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/workers/9999/payments",
      });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  // ── Weigh-ins ─────────────────────────────────────────────────────────────

  describe("POST /api/weigh-ins", () => {
    it("returns 404 for an unknown fruit type", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/weigh-ins",
        payload: { workerNumber: "101", weightKg: 10, fruitTypeId: 99999 },
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it("returns 400 for an invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/weigh-ins",
        payload: { workerNumber: "", weightKg: -1 },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it("creates a weigh-in and returns 201 with worker summary", async () => {
      // Create a fruit type first
      const ftRes = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "Raspberry", amdPerKg: 600 },
      });
      const fruitTypeId = JSON.parse(ftRes.body).id;

      const res = await app.inject({
        method: "POST",
        url: "/api/weigh-ins",
        payload: { workerNumber: "201", weightKg: 5, fruitTypeId },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.body);
      assert.ok(body.weighIn);
      assert.strictEqual(body.weighIn.workerNumber, "201");
      assert.strictEqual(body.weighIn.weightKg, 5);
      assert.ok(typeof body.weighIn.earnedCents === "number");
      assert.ok(body.workerSummary);
    });
  });

  // ── Worker Ledger ─────────────────────────────────────────────────────────

  describe("GET /api/workers/:workerNumber/ledger", () => {
    it("returns 404 for an unknown worker", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/workers/88888/ledger",
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it("returns ledger with transactions after a weigh-in", async () => {
      // Worker 201 was created by the weigh-in test above
      const res = await app.inject({
        method: "GET",
        url: "/api/workers/201/ledger",
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.ok(body.worker);
      assert.strictEqual(body.worker.workerNumber, "201");
      assert.ok(Array.isArray(body.ledger));
      assert.ok(body.ledger.length >= 1);
      const first = body.ledger[0];
      assert.strictEqual(first.type, "weigh_in");
      assert.ok(typeof first.runningOutstandingCents === "number");
      assert.ok(first.runningOutstandingCents > 0);
    });

    it("running balance decreases after payment", async () => {
      // Pay worker 201
      await app.inject({ method: "POST", url: "/api/workers/201/payments" });

      const res = await app.inject({
        method: "GET",
        url: "/api/workers/201/ledger",
      });
      const body = JSON.parse(res.body);
      const last = body.ledger[body.ledger.length - 1];
      assert.strictEqual(last.type, "payment");
      assert.strictEqual(last.runningOutstandingCents, 0);
    });
  });

  // ── Outstanding Workers ───────────────────────────────────────────────────

  describe("GET /api/workers/outstanding", () => {
    it("returns an array", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/workers/outstanding",
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.ok(Array.isArray(body.workers));
    });

    it("includes a worker with unpaid balance", async () => {
      // Create a new fruit type and weigh-in for worker 301 (no payment)
      const ftRes = await app.inject({
        method: "POST",
        url: "/api/fruit-types",
        payload: { name: "Gooseberry", amdPerKg: 450 },
      });
      const fruitTypeId = JSON.parse(ftRes.body).id;

      await app.inject({
        method: "POST",
        url: "/api/weigh-ins",
        payload: { workerNumber: "301", weightKg: 3, fruitTypeId },
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/workers/outstanding",
      });
      const body = JSON.parse(res.body);
      const worker301 = body.workers.find(
        (w: { workerNumber: string }) => w.workerNumber === "301",
      );
      assert.ok(worker301, "worker 301 should appear in outstanding list");
      assert.ok(worker301.outstandingCents > 0);
    });
  });

  // ── Reports ───────────────────────────────────────────────────────────────

  describe("GET /api/reports/daily.csv", () => {
    it("returns 400 for missing date", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/reports/daily.csv",
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it("returns 400 for invalid date format", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/reports/daily.csv?date=not-a-date",
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it("returns CSV content for a valid date", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await app.inject({
        method: "GET",
        url: `/api/reports/daily.csv?date=${today}`,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers["content-type"]?.toString().includes("text/csv"));
      assert.ok(res.body.startsWith("date,workerNumber"));
    });
  });

  describe("GET /api/reports/home-stats", () => {
    it("returns daily, weekly, monthly stats", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/reports/home-stats",
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.ok(body.daily);
      assert.ok(body.weekly);
      assert.ok(body.monthly);
      assert.ok(typeof body.daily.totalWeightKg === "number");
      assert.ok(Array.isArray(body.daily.byFruitType));
    });
  });
});
