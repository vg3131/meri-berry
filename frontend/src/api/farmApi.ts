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

function csvPath(from: string, to: string): string {
  if (from === to) {
    return `/api/reports/daily.csv?date=${encodeURIComponent(from)}`;
  }
  return `/api/reports/daily.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

/**
 * Fetch CSV via the fetch API (not a navigation link) so Vite's dev proxy
 * handles it correctly, then trigger a browser download via a Blob URL.
 */
export async function downloadCsv(from: string, to: string, filename: string): Promise<void> {
  const res = await fetch(csvPath(from, to));
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CSV export failed (${res.status}): ${body}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
