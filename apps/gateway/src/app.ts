// Builds the gateway app without starting it, so tests can inject a fake charges API.
import proxy from "@fastify/http-proxy";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { GatewayConfig } from "./config.js";
import type { ChargesApi } from "./flupay.js";
import { createPaywall } from "./paywall.js";

export async function buildApp(
  config: Pick<GatewayConfig, "upstream" | "routes">,
  flupay: ChargesApi,
  options: FastifyServerOptions = { logger: true },
) {
  const app = Fastify(options);

  // Gateway's own endpoints live under /_gateway so they never clash with the upstream.
  app.get("/_gateway/health", async () => ({ ok: true, upstream: config.upstream }));

  app.addHook("onRequest", createPaywall(config.routes, flupay));

  await app.register(proxy, { upstream: config.upstream, prefix: "/" });
  return app;
}
