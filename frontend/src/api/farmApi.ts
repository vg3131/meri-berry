import { apiRequest } from "./api";
import {
  type CreateWeighInResponse,
  type FruitType,
  type WorkerSummaryResponse,
  type PayWorkerResponse,
  type WorkerLedgerResponse,
  type OutstandingWorkersResponse,
  type HomeStatsResponse,
} from "../types/farm";

export type CreateWeighInPayload = {
  workerNumber: string;
  weightKg: number;
  fruitTypeId: number;
};

export type CreateFruitTypePayload = {
  name: string;
  amdPerKg: number;
};

export function createWeighIn(payload: CreateWeighInPayload) {
  return apiRequest<CreateWeighInResponse, CreateWeighInPayload>({
    method: "POST",
    path: "/api/weigh-ins",
    payload,
  });
}

export function getWorkerSummary(workerNumber: string) {
  return apiRequest<WorkerSummaryResponse>({
    method: "GET",
    path: `/api/workers/${encodeURIComponent(workerNumber)}/summary`,
  });
}

export function payWorker(workerNumber: string) {
  return apiRequest<PayWorkerResponse>({
    method: "POST",
    path: `/api/workers/${encodeURIComponent(workerNumber)}/payments`,
  });
}

export function getFruitTypes() {
  return apiRequest<FruitType[]>({
    method: "GET",
    path: "/api/fruit-types",
  });
}

export function createFruitType(payload: CreateFruitTypePayload) {
  return apiRequest<FruitType, CreateFruitTypePayload>({
    method: "POST",
    path: "/api/fruit-types",
    payload,
  });
}

export function getWorkerLedger(workerNumber: string) {
  return apiRequest<WorkerLedgerResponse>({
    method: "GET",
    path: `/api/workers/${encodeURIComponent(workerNumber)}/ledger`,
  });
}

export function getWorkersOutstanding() {
  return apiRequest<OutstandingWorkersResponse>({
    method: "GET",
    path: "/api/workers/outstanding",
  });
}

export function getHomeStats() {
  return apiRequest<HomeStatsResponse>({
    method: "GET",
    path: "/api/reports/home-stats",
  });
}

export function getDailyCsvUrl(date: string): string {
  return `/api/reports/daily.csv?date=${encodeURIComponent(date)}`;
}
