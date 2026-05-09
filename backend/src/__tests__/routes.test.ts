/**
 * Route integration tests.
 *
 * DATABASE_PATH=:memory: must be set before this module is loaded.
 * The npm "test" script sets it automatically.
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
import { db } from "../db/client";
import { buildApp } from "../app";

// Apply both migration files to the in-memory DB before any test runs.
function applyMigrations() {
  const migrationsDir = path.resolve(__dirname, "../db/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
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
  let app: ReturnType<typeof buildApp>;

  before(async () => {
    applyMigrations();
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

    it("returns 400 for invalid payload", async () => {
    it("returns 400 for an invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/weigh-ins",
        payload: { workerNumber: "", weightKg: -1 },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });
});
