import { apiRequest } from "./api";
import {
  type CreateWeighInResponse,
  type WorkerSummaryResponse,
  type PayWorkerResponse,
} from "../types/farm";

export type CreateWeighInPayload = {
  workerNumber: string;
  weightKg: number;
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
