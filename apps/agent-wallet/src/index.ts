import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./env.js";
import { WalletError } from "./errors.js";
import { registerMcp } from "./mcp.js";
import { registerRoutes } from "./routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: [env.DASHBOARD_URL] });

app.setErrorHandler((err, req, reply) => {
  if (err instanceof WalletError) return reply.code(err.httpStatus).send(err.toJSON());
  if (err instanceof ZodError) return reply.code(400).send({ error: "VALIDATION_ERROR", issues: err.issues });
  req.log.error({ err }, "unhandled error");
  return reply.code(500).send({ error: "INTERNAL_ERROR" });
});

registerRoutes(app);
registerMcp(app);

await app.listen({ port: env.AGENT_WALLET_PORT, host: "0.0.0.0" });
