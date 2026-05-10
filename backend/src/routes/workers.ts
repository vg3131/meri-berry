import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getWorker, getWorkerSummary, insertPayment, getWorkerLedger, getAllWorkersOutstanding } from "../db/queries";
import { gramsToKg } from "../utils/math";

type WorkerParams = {
  workerNumber: string;
};

async function sendWorkerSummary(
  request: FastifyRequest<{ Params: WorkerParams }>,
  reply: FastifyReply,
) {
  const { workerNumber } = request.params;
  const worker = getWorker(workerNumber);

  if (!worker) {
    return reply.code(404).send({ message: "Worker not found" });
  }

  const summary = getWorkerSummary(workerNumber);
  const outstandingCents = Math.max(summary.totalEarnedCents - summary.totalPaidCents, 0);

  return {
    worker: {
      workerNumber: worker.worker_number,
      name: worker.name,
      active: worker.active === 1,
      createdAt: worker.created_at,
    },
    summary: {
      totalWeightGrams: summary.totalWeightGrams,
      totalWeightKg: gramsToKg(summary.totalWeightGrams),
      totalEarnedCents: summary.totalEarnedCents,
      totalPaidCents: summary.totalPaidCents,
      outstandingCents,
    },
  };
}

async function payWorker(
  request: FastifyRequest<{ Params: WorkerParams }>,
  reply: FastifyReply,
) {
  const { workerNumber } = request.params;
  const worker = getWorker(workerNumber);

  if (!worker) {
    return reply.code(404).send({ message: "Worker not found" });
  }

  const summary = getWorkerSummary(workerNumber);
  const outstandingCents = Math.max(summary.totalEarnedCents - summary.totalPaidCents, 0);

  if (outstandingCents === 0) {
    return reply.code(422).send({ message: "Worker has no outstanding balance to pay" });
  }

  insertPayment({
    workerNumber,
    amountCents: outstandingCents,
    currencyCodeSnapshot: "AMD",
  });

  const updatedSummary = getWorkerSummary(workerNumber);

  return reply.code(201).send({
    payment: {
      workerNumber,
      amountCents: outstandingCents,
    },
    summary: {
      totalWeightGrams: updatedSummary.totalWeightGrams,
      totalWeightKg: gramsToKg(updatedSummary.totalWeightGrams),
      totalEarnedCents: updatedSummary.totalEarnedCents,
      totalPaidCents: updatedSummary.totalPaidCents,
      outstandingCents: Math.max(
        updatedSummary.totalEarnedCents - updatedSummary.totalPaidCents,
        0,
      ),
    },
  });
}

async function sendWorkerLedger(
  request: FastifyRequest<{ Params: WorkerParams }>,
  reply: FastifyReply,
) {
  const { workerNumber } = request.params;
  const worker = getWorker(workerNumber);

  if (!worker) {
    return reply.code(404).send({ message: "Worker not found" });
  }

  const rows = getWorkerLedger(workerNumber);

  let running = 0;
  const ledger = rows.map((row) => {
    if (row.type === "weigh_in") running += row.amountCents;
    else running -= row.amountCents;
    return { ...row, runningOutstandingCents: running };
  });

  return {
    worker: {
      workerNumber: worker.worker_number,
      name: worker.name,
      active: worker.active === 1,
    },
    ledger,
  };
}

async function sendAllWorkersOutstanding(_request: FastifyRequest, _reply: FastifyReply) {
  const rows = getAllWorkersOutstanding();
  return {
    workers: rows.map((r) => ({
      workerNumber: r.workerNumber,
      name: r.name,
      totalWeightGrams: r.totalWeightGrams,
      totalWeightKg: gramsToKg(r.totalWeightGrams),
      totalEarnedCents: r.totalEarnedCents,
      totalPaidCents: r.totalPaidCents,
      outstandingCents: r.outstandingCents,
    })),
  };
}

export async function workerRoutes(app: FastifyInstance) {
  // Static routes first (before parameterised ones)
  app.get("/workers/outstanding", sendAllWorkersOutstanding);

  app.get<{ Params: WorkerParams }>("/workers/:workerNumber", sendWorkerSummary);
  app.get<{ Params: WorkerParams }>("/workers/:workerNumber/summary", sendWorkerSummary);
  app.post<{ Params: WorkerParams }>("/workers/:workerNumber/payments", payWorker);
  app.get<{ Params: WorkerParams }>("/workers/:workerNumber/ledger", sendWorkerLedger);
}
