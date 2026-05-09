import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getFruitTypes, insertFruitType } from "../db/queries";

const createFruitTypeBodySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  amdPerKg: z.number().int().positive("amdPerKg must be a positive integer"),
});

export async function fruitTypeRoutes(app: FastifyInstance) {
  app.get("/fruit-types", async () => {
    const fruitTypes = getFruitTypes();
    return fruitTypes.map((ft) => ({
      id: ft.id,
      name: ft.name,
      amdPerKg: ft.cents_per_kg,
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

    const { name, amdPerKg } = parsedBody.data;

    try {
      const fruitType = insertFruitType(name, amdPerKg);
      return reply.code(201).send({
        id: fruitType.id,
        name: fruitType.name,
        amdPerKg: fruitType.cents_per_kg,
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
