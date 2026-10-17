// Gateway entry point: reverse proxy that charges AI agents per route through FluPay.
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createFlupayClient } from "./flupay.js";

const config = loadConfig();
const app = await buildApp(config, createFlupayClient(config.flupayUrl, config.flupayApiKey));

await app.listen({ port: config.port, host: "0.0.0.0" });
