import { apiRequest } from "./api";
import {
  type CreateWeighInResponse,
  type FruitType,
  type WorkerSummaryResponse,
  type PayWorkerResponse,
} from "../types/farm";

export type CreateWeighInPayload = {
  workerNumber: string;
  weightKg: number;
  fruitTypeId: number;
};

export type CreateFruitTypePayload = {
  name: string;
  centsPerkKg: number;
  currencyCode: string;
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
