export type TabKey = "home" | "weigh" | "pay" | "summary" | "produce" | "ledger" | "outstanding";

export type WorkerProfile = {
  workerNumber: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export type WorkerTotals = {
  totalWeightGrams: number;
  totalEarnedCents: number;
  totalPaidCents: number;
};

export type FruitType = {
  id: number;
  name: string;
  amdPerKg: number | null;
  createdAt: string;
};

export type WeighInResult = {
  id: number;
  workerNumber: string;
  weightKg: number;
  earnedCents: number;
  fruitType: string;
  recordedAt: string;
};

export type WeighInSummary = WorkerTotals & {
  outstandingCents: number;
};

export type WeighInSubmissionResult = {
  weighIn: WeighInResult;
  workerSummary: WeighInSummary;
};

export type WorkerSummaryResponse = {
  worker: WorkerProfile;
  summary: {
    totalWeightGrams: number;
    totalWeightKg: number;
    totalEarnedCents: number;
    totalPaidCents: number;
    outstandingCents: number;
  };
};

export type WorkerSummaryView = WorkerSummaryResponse;
export type CreateWeighInResponse = WeighInSubmissionResult;

export type WorkerPaymentSummary = {
  totalWeightGrams: number;
  totalWeightKg: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  outstandingCents: number;
};

export type PayWorkerResponse = {
  payment: {
    workerNumber: string;
    amountCents: number;
  };
  summary: WorkerPaymentSummary;
};

// Ledger types
export type LedgerEntry = {
  type: "weigh_in" | "payment";
  id: number;
  occurredAt: string;
  amountCents: number;
  fruitTypeName: string | null;
  weightGrams: number | null;
  note: string | null;
  runningOutstandingCents: number;
};

export type WorkerLedgerResponse = {
  worker: {
    workerNumber: string;
    name: string;
    active: boolean;
  };
  ledger: LedgerEntry[];
};

// Outstanding workers types
export type OutstandingWorker = {
  workerNumber: string;
  name: string;
  totalWeightGrams: number;
  totalWeightKg: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  outstandingCents: number;
};

export type OutstandingWorkersResponse = {
  workers: OutstandingWorker[];
};

// Home stats types
export type FruitTypeStat = {
  fruitType: string;
  weightKg: number;
  earnedAmd: number;
  weighInCount: number;
};

export type PeriodStats = {
  totalWeightKg: number;
  totalEarnedAmd: number;
  weighInCount: number;
  byFruitType: FruitTypeStat[];
};

export type HomeStatsResponse = {
  daily: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
};
