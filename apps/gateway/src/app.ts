// Builds the gateway app without starting it, so tests can inject a fake charges API.
import { timingSafeEqual } from "node:crypto";
import proxy from "@fastify/http-proxy";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { GatewayConfig } from "./config.js";
import type { ChargesApi } from "./flupay.js";
import { createPaywall } from "./paywall.js";
import { GatewayStats } from "./stats.js";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function buildApp(
  config: Pick<GatewayConfig, "upstream" | "routes"> & Partial<Pick<GatewayConfig, "charge" | "adminKey">>,
  flupay: ChargesApi,
  options: FastifyServerOptions = { logger: true },
) {
  const app = Fastify(options);
  const stats = new GatewayStats();

  // Gateway's own endpoints live under /_gateway so they never clash with the upstream.
  app.get("/_gateway/health", async () => ({ ok: true, upstream: config.upstream, charge: config.charge ?? "agents" }));

  // Live counters for the demo. Disabled unless GATEWAY_ADMIN_KEY is set.
  app.get("/_gateway/stats", async (req, reply) => {
    const expected = config.adminKey;
    const given = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    if (!expected) return reply.code(404).send({ error: "not_found" });
    if (!sameSecret(given, expected)) return reply.code(401).send({ error: "unauthorized" });
    return stats.toJSON();
  });

  app.addHook("onRequest", createPaywall({ routes: config.routes, flupay, charge: config.charge, stats }));

  await app.register(proxy, { upstream: config.upstream, prefix: "/" });
  return app;
}
