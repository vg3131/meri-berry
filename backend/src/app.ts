import Fastify from "fastify";
import { weighInRoutes } from "./routes/weighIns";
import { workerRoutes } from "./routes/workers";
import { fruitTypeRoutes } from "./routes/fruitTypes";
import { reportRoutes } from "./routes/reports";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(swagger, {
    openapi: {
      info: { title: "Meri Berry API", version: "1.0.0" },
    },
  });
  app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(weighInRoutes, { prefix: "/api" });
  app.register(workerRoutes, { prefix: "/api" });
  app.register(fruitTypeRoutes, { prefix: "/api" });
  app.register(reportRoutes, { prefix: "/api" });

  return app;
}
