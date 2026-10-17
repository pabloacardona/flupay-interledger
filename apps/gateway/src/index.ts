// Gateway: reverse proxy in front of the upstream API.
// This phase forwards every request unchanged and logs the configured price;
// charging (402) and payment verification come in the next phases.
import proxy from "@fastify/http-proxy";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { priceFor } from "./pricing.js";

const config = loadConfig();
const app = Fastify({ logger: true });

// Gateway's own endpoints live under /_gateway so they never clash with the upstream.
app.get("/_gateway/health", async () => ({ ok: true, upstream: config.upstream }));

app.addHook("onRequest", async (req) => {
  const { rule, price } = priceFor(config.routes, req.url);
  req.log.info({ route: rule?.path ?? null, price: price ? `${price.amount} ${price.currency}` : "free" }, "priced request");
});

await app.register(proxy, { upstream: config.upstream, prefix: "/" });

await app.listen({ port: config.port, host: "0.0.0.0" });
