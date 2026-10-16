// Sample API that sits behind the gateway. It knows nothing about payments:
// the gateway decides which routes cost money (see apps/gateway/gateway.yaml).
import Fastify from "fastify";

const port = Number(process.env.DEMO_API_PORT ?? 3000);

const app = Fastify({ logger: true });

// Free route (gateway.yaml: /* -> free).
app.get("/", async () => ({
  name: "FluPay demo API",
  routes: {
    "/api/weather": "0.01 USD",
    "/api/premium/report": "0.05 USD",
  },
}));

app.get("/health", async () => ({ ok: true }));

// Priced route (gateway.yaml: /api/* -> 0.01 USD).
app.get("/api/weather", async (req) => {
  const { city = "Medellín" } = req.query as { city?: string };
  return {
    city,
    temperature_c: 24,
    condition: "partly cloudy",
    observed_at: new Date().toISOString(),
  };
});

// Priced route (gateway.yaml: /api/premium/* -> 0.05 USD).
app.get("/api/premium/report", async () => ({
  title: "AI agent traffic report",
  period: "2026-10",
  summary: "Agent requests grew 38% month over month; 12% of them now pay per request.",
  top_agents: [
    { name: "research-bot", requests: 18_240 },
    { name: "price-watcher", requests: 9_115 },
  ],
  generated_at: new Date().toISOString(),
}));

await app.listen({ port, host: "0.0.0.0" });
