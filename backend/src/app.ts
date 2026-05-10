import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import path from "path";
import fs from "fs";
import { weighInRoutes } from "./routes/weighIns";
import { workerRoutes } from "./routes/workers";
import { fruitTypeRoutes } from "./routes/fruitTypes";
import { reportRoutes } from "./routes/reports";

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

  // Serve the compiled React frontend in production.
  // In development the Vite dev server handles this instead.
  const publicPath = path.join(__dirname, "..", "public");
  if (fs.existsSync(publicPath)) {
    app.register(fastifyStatic, { root: publicPath, prefix: "/" });

    // Catch-all: serve index.html for any non-API path so the SPA loads.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api")) {
        return reply.code(404).send({ message: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
