import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ensureWorker,
  getFruitTypeById,
  getLatestRateForFruitType,
  getWorkerSummary,
  insertWeighIn,
} from "../db/queries";

const createWeighInBodySchema = z.object({
  workerNumber: z.string().trim().min(1, "workerNumber is required"),
  weightKg: z.number().positive("weightKg must be greater than 0"),
  fruitTypeId: z.number().int().positive("fruitTypeId is required"),
});

function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

function gramsToKg(grams: number): number {
  return Number((grams / 1000).toFixed(3));
}

function calculateEarnedCentsForGrams(grams: number, rateCentsPerKg: number): number {
  return Math.round((grams / 1000) * rateCentsPerKg);
}

export async function weighInRoutes(app: FastifyInstance) {
  app.post("/weigh-ins", async (request, reply) => {
    const parsedBody = createWeighInBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        message: "Invalid weigh-in payload",
        issues: parsedBody.error.issues,
      });
    }

    const { workerNumber, weightKg, fruitTypeId } = parsedBody.data;

    const fruitType = getFruitTypeById(fruitTypeId);
    if (!fruitType) {
      return reply.code(404).send({ message: "Fruit type not found" });
    }

    const rate = getLatestRateForFruitType(fruitTypeId);
    if (!rate) {
      return reply.code(500).send({ message: "No rate configured for this fruit type" });
    }

    ensureWorker(workerNumber);

    const weightGrams = kgToGrams(weightKg);

    const weighIn = insertWeighIn({
      workerNumber,
      weightGrams,
      rateCentsPerKgSnapshot: rate.cents_per_kg,
      currencyCodeSnapshot: rate.currency_code,
      fruitTypeId,
    });

    const workerSummary = getWorkerSummary(workerNumber);
    const outstandingCents = Math.max(
      workerSummary.totalEarnedCents - workerSummary.totalPaidCents,
      0,
    );

    return reply.code(201).send({
      weighIn: {
        id: weighIn.id,
        workerNumber: weighIn.worker_number,
        weightKg: gramsToKg(weighIn.weight_grams),
        earnedCents: calculateEarnedCentsForGrams(
          weighIn.weight_grams,
          weighIn.rate_cents_per_kg_snapshot,
        ),
        currencyCode: weighIn.currency_code_snapshot,
        fruitType: fruitType.name,
        recordedAt: weighIn.recorded_at,
      },
      workerSummary: {
        ...workerSummary,
        outstandingCents,
      },
    });
  });
}
