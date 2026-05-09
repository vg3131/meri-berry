export type TabKey = "home" | "weigh" | "pay" | "summary";

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

export type WeighInResult = {
  id: number;
  workerNumber: string;
  weightKg: number;
  earnedCents: number;
  currencyCode: string;
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
