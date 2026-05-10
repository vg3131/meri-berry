import { db } from "./client";

// Row/return types
export type WorkerRow = {
  worker_number: string;
  name: string;
  active: number;
  created_at: string;
};

export type FruitTypeRow = {
  id: number;
  name: string;
  created_at: string;
};

export type FruitTypeWithRateRow = FruitTypeRow & {
  cents_per_kg: number | null;
  currency_code: string | null;
};

export type RateRow = {
  id: number;
  fruit_type_id: number | null;
  cents_per_kg: number;
  currency_code: string;
  effective_from: string;
  created_at: string;
};

export type WeighInInsertInput = {
  workerNumber: string;
  weightGrams: number;
  rateCentsPerKgSnapshot: number;
  currencyCodeSnapshot: string;
  fruitTypeId: number;
};

export type WeighInRow = {
  id: number;
  worker_number: string;
  weight_grams: number;
  rate_cents_per_kg_snapshot: number;
  currency_code_snapshot: string;
  fruit_type_id: number | null;
  recorded_at: string;
};

export type PaymentInsertInput = {
  workerNumber: string;
  amountCents: number;
  currencyCodeSnapshot: string;
  note?: string;
};

export type WorkerSummaryRow = {
  totalWeightGrams: number;
  totalEarnedCents: number;
  totalPaidCents: number;
};

// Worker query functions
const getWorkerStatement = db.prepare(`
  SELECT worker_number, name, active, created_at
  FROM workers
  WHERE worker_number = ?
`);

export function getWorker(workerNumber: string): WorkerRow | undefined {
  return getWorkerStatement.get(workerNumber) as WorkerRow | undefined;
}

const ensureWorkerStatement = db.prepare(`
  INSERT INTO workers (worker_number, name, active)
  VALUES (@workerNumber, @name, 1)
  ON CONFLICT(worker_number) DO NOTHING
`);

export function ensureWorker(workerNumber: string): WorkerRow {
  ensureWorkerStatement.run({ workerNumber, name: `Worker ${workerNumber}` });
  const worker = getWorker(workerNumber);
  if (!worker) throw new Error("Failed to create or load worker");
  return worker;
}

// Fruit type query functions
const getFruitTypesStatement = db.prepare(`
  SELECT
    ft.id,
    ft.name,
    ft.created_at,
    r.cents_per_kg,
    r.currency_code
  FROM fruit_types ft
  LEFT JOIN rates r ON r.id = (
    SELECT id FROM rates
    WHERE fruit_type_id = ft.id
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  )
  ORDER BY ft.name ASC
`);

export function getFruitTypes(): FruitTypeWithRateRow[] {
  return getFruitTypesStatement.all() as FruitTypeWithRateRow[];
}

const getFruitTypeByIdStatement = db.prepare(`
  SELECT id, name, created_at FROM fruit_types WHERE id = ?
`);

export function getFruitTypeById(id: number): FruitTypeRow | undefined {
  return getFruitTypeByIdStatement.get(id) as FruitTypeRow | undefined;
}

const insertFruitTypeStatement = db.prepare(`
  INSERT INTO fruit_types (name) VALUES (@name)
`);

const insertRateStatement = db.prepare(`
  INSERT INTO rates (fruit_type_id, cents_per_kg, currency_code, effective_from)
  VALUES (@fruitTypeId, @centsPerkKg, 'AMD', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
`);

export function insertFruitType(
  name: string,
  centsPerkKg: number,
): FruitTypeWithRateRow {
  const result = insertFruitTypeStatement.run({ name });
  const fruitTypeId = Number(result.lastInsertRowid);
  insertRateStatement.run({ fruitTypeId, centsPerkKg });
  const fruitType = getFruitTypeById(fruitTypeId);
  if (!fruitType) throw new Error("Failed to fetch inserted fruit type");
  return { ...fruitType, cents_per_kg: centsPerkKg, currency_code: "AMD" };
}

// Rate query functions
const getLatestRateStatement = db.prepare(`
  SELECT id, fruit_type_id, cents_per_kg, currency_code, effective_from, created_at
  FROM rates
  ORDER BY effective_from DESC, id DESC
  LIMIT 1
`);

export function getLatestRate(): RateRow | undefined {
  return getLatestRateStatement.get() as RateRow | undefined;
}

const getLatestRateForFruitTypeStatement = db.prepare(`
  SELECT id, fruit_type_id, cents_per_kg, currency_code, effective_from, created_at
  FROM rates
  WHERE fruit_type_id = ?
  ORDER BY effective_from DESC, id DESC
  LIMIT 1
`);

export function getLatestRateForFruitType(fruitTypeId: number): RateRow | undefined {
  return getLatestRateForFruitTypeStatement.get(fruitTypeId) as RateRow | undefined;
}

// Weigh-in query functions
const insertWeighInStatement = db.prepare(`
  INSERT INTO weigh_ins (
    worker_number,
    weight_grams,
    rate_cents_per_kg_snapshot,
    currency_code_snapshot,
    fruit_type_id
  ) VALUES (
    @workerNumber,
    @weightGrams,
    @rateCentsPerKgSnapshot,
    @currencyCodeSnapshot,
    @fruitTypeId
  )
`);

const getWeighInByIdStatement = db.prepare(`
  SELECT
    id,
    worker_number,
    weight_grams,
    rate_cents_per_kg_snapshot,
    currency_code_snapshot,
    fruit_type_id,
    recorded_at
  FROM weigh_ins
  WHERE id = ?
`);

export function insertWeighIn(input: WeighInInsertInput): WeighInRow {
  const result = insertWeighInStatement.run(input);
  const insertedId = Number(result.lastInsertRowid);
  const weighIn = getWeighInByIdStatement.get(insertedId) as WeighInRow | undefined;
  if (!weighIn) throw new Error("Failed to fetch inserted weigh-in");
  return weighIn;
}

// Payment query functions
const insertPaymentStatement = db.prepare(`
  INSERT INTO payments (worker_number, amount_cents, currency_code_snapshot, note)
  VALUES (@workerNumber, @amountCents, @currencyCodeSnapshot, @note)
`);

export function insertPayment(input: PaymentInsertInput): void {
  insertPaymentStatement.run({ ...input, note: input.note ?? null });
}

// Summary query functions
const getWorkerSummaryStatement = db.prepare(`
  SELECT
    COALESCE((SELECT SUM(weight_grams) FROM weigh_ins WHERE worker_number = ?), 0) AS totalWeightGrams,
    COALESCE(
      (SELECT SUM(CAST(ROUND((weight_grams / 1000.0) * rate_cents_per_kg_snapshot) AS INTEGER))
       FROM weigh_ins WHERE worker_number = ?),
      0
    ) AS totalEarnedCents,
    COALESCE((SELECT SUM(amount_cents) FROM payments WHERE worker_number = ?), 0) AS totalPaidCents
`);

export function getWorkerSummary(workerNumber: string): WorkerSummaryRow {
  return getWorkerSummaryStatement.get(
    workerNumber,
    workerNumber,
    workerNumber,
  ) as WorkerSummaryRow;
}

// Ledger query functions
export type LedgerRow = {
  type: "weigh_in" | "payment";
  id: number;
  occurredAt: string;
  amountCents: number;
  fruitTypeName: string | null;
  weightGrams: number | null;
  note: string | null;
};

const getWorkerLedgerStatement = db.prepare(`
  SELECT
    'weigh_in' AS type,
    wi.id,
    wi.recorded_at AS occurredAt,
    CAST(ROUND((wi.weight_grams / 1000.0) * wi.rate_cents_per_kg_snapshot) AS INTEGER) AS amountCents,
    ft.name AS fruitTypeName,
    wi.weight_grams AS weightGrams,
    NULL AS note
  FROM weigh_ins wi
  LEFT JOIN fruit_types ft ON ft.id = wi.fruit_type_id
  WHERE wi.worker_number = ?

  UNION ALL

  SELECT
    'payment' AS type,
    p.id,
    p.recorded_at AS occurredAt,
    p.amount_cents AS amountCents,
    NULL AS fruitTypeName,
    NULL AS weightGrams,
    p.note
  FROM payments p
  WHERE p.worker_number = ?

  ORDER BY occurredAt ASC, id ASC
`);

export function getWorkerLedger(workerNumber: string): LedgerRow[] {
  return getWorkerLedgerStatement.all(workerNumber, workerNumber) as LedgerRow[];
}

// Outstanding workers query functions
export type OutstandingWorkerRow = {
  workerNumber: string;
  name: string;
  totalWeightGrams: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  outstandingCents: number;
};

const getAllWorkersOutstandingStatement = db.prepare(`
  SELECT
    w.worker_number AS workerNumber,
    w.name,
    COALESCE((
      SELECT SUM(weight_grams)
      FROM weigh_ins
      WHERE worker_number = w.worker_number
    ), 0) AS totalWeightGrams,
    COALESCE((
      SELECT SUM(CAST(ROUND((weight_grams / 1000.0) * rate_cents_per_kg_snapshot) AS INTEGER))
      FROM weigh_ins
      WHERE worker_number = w.worker_number
    ), 0) AS totalEarnedCents,
    COALESCE((
      SELECT SUM(amount_cents)
      FROM payments
      WHERE worker_number = w.worker_number
    ), 0) AS totalPaidCents,
    COALESCE((
      SELECT SUM(CAST(ROUND((weight_grams / 1000.0) * rate_cents_per_kg_snapshot) AS INTEGER))
      FROM weigh_ins
      WHERE worker_number = w.worker_number
    ), 0) - COALESCE((
      SELECT SUM(amount_cents)
      FROM payments
      WHERE worker_number = w.worker_number
    ), 0) AS outstandingCents
  FROM workers w
  WHERE w.active = 1
    AND COALESCE((
      SELECT SUM(CAST(ROUND((weight_grams / 1000.0) * rate_cents_per_kg_snapshot) AS INTEGER))
      FROM weigh_ins
      WHERE worker_number = w.worker_number
    ), 0) > COALESCE((
      SELECT SUM(amount_cents)
      FROM payments
      WHERE worker_number = w.worker_number
    ), 0)
  ORDER BY outstandingCents DESC
`);

export function getAllWorkersOutstanding(): OutstandingWorkerRow[] {
  return getAllWorkersOutstandingStatement.all() as OutstandingWorkerRow[];
}

// Home stats query functions
export type HomeStatsRow = {
  fruitTypeName: string;
  totalWeightGrams: number;
  totalEarnedCents: number;
  weighInCount: number;
};

const getHomeStatsStatement = db.prepare(`
  SELECT
    COALESCE(ft.name, 'Unknown') AS fruitTypeName,
    SUM(wi.weight_grams) AS totalWeightGrams,
    SUM(CAST(ROUND((wi.weight_grams / 1000.0) * wi.rate_cents_per_kg_snapshot) AS INTEGER)) AS totalEarnedCents,
    COUNT(*) AS weighInCount
  FROM weigh_ins wi
  LEFT JOIN fruit_types ft ON ft.id = wi.fruit_type_id
  WHERE wi.recorded_at >= ?
    AND wi.recorded_at < ?
  GROUP BY wi.fruit_type_id, ft.name
  ORDER BY totalEarnedCents DESC
`);

export function getHomeStats(fromIso: string, toIso: string): HomeStatsRow[] {
  return getHomeStatsStatement.all(fromIso, toIso) as HomeStatsRow[];
}

// Daily CSV query functions
export type DailyWeighInRow = {
  workerNumber: string;
  workerName: string;
  fruitTypeName: string | null;
  weightGrams: number;
  earnedCents: number;
  recordedAt: string;
};

const getDailyWeighInsStatement = db.prepare(`
  SELECT
    wi.worker_number AS workerNumber,
    w.name AS workerName,
    COALESCE(ft.name, 'Unknown') AS fruitTypeName,
    wi.weight_grams AS weightGrams,
    CAST(ROUND((wi.weight_grams / 1000.0) * wi.rate_cents_per_kg_snapshot) AS INTEGER) AS earnedCents,
    wi.recorded_at AS recordedAt
  FROM weigh_ins wi
  LEFT JOIN workers w ON w.worker_number = wi.worker_number
  LEFT JOIN fruit_types ft ON ft.id = wi.fruit_type_id
  WHERE wi.recorded_at >= ?
    AND wi.recorded_at < ?
  ORDER BY wi.recorded_at ASC
`);

export function getDailyWeighIns(fromIso: string, toIso: string): DailyWeighInRow[] {
  return getDailyWeighInsStatement.all(fromIso, toIso) as DailyWeighInRow[];
}