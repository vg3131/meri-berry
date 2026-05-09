import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getFruitTypes, insertFruitType } from "../db/queries";

const createFruitTypeBodySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  centsPerkKg: z.number().int().positive("centsPerkKg must be a positive integer"),
  currencyCode: z.string().length(3).toUpperCase(),
});

export async function fruitTypeRoutes(app: FastifyInstance) {
  app.get("/fruit-types", async () => {
    const fruitTypes = getFruitTypes();
    return fruitTypes.map((ft) => ({
      id: ft.id,
      name: ft.name,
      centsPerkKg: ft.cents_per_kg,
      currencyCode: ft.currency_code,
      createdAt: ft.created_at,
    }));
  });

  app.post("/fruit-types", async (request, reply) => {
    const parsedBody = createFruitTypeBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        message: "Invalid fruit type payload",
        issues: parsedBody.error.issues,
      });
    }

    const { name, centsPerkKg, currencyCode } = parsedBody.data;

    try {
      const fruitType = insertFruitType(name, centsPerkKg, currencyCode);
      return reply.code(201).send({
        id: fruitType.id,
        name: fruitType.name,
        centsPerkKg: fruitType.cents_per_kg,
        currencyCode: fruitType.currency_code,
        createdAt: fruitType.created_at,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("UNIQUE constraint failed")) {
        return reply.code(409).send({ message: `A fruit type named "${name}" already exists` });
      }
      throw err;
    }
  });
}
