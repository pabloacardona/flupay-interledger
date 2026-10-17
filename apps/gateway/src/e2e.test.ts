// End to end over real HTTP: upstream API, gateway with the real FluPay client, and a
// fake FluPay server that answers like apps/web. The "agent" follows the same steps as
// paid_fetch in apps/agent-wallet: request, read Payment-Required, pay, retry with proof.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { buildPaymentAuthorization, parsePaymentRequiredHeader, toMinor } from "@flupay/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createFlupayClient } from "./flupay.js";

const API_KEY = "sk_e2e_merchant";
const servers: FastifyInstance[] = [];
let gatewayUrl: string;
/** incoming url -> charge state, shared with the fake "agent wallet" below. */
const charges = new Map<string, { id: string; status: string; amount: string; reference: string | null; expires_at: string }>();

before(async () => {
  const upstream = Fastify();
  upstream.get("/api/weather", async () => ({ city: "Medellín", temperature_c: 24 }));
  upstream.get("/", async () => ({ name: "demo" }));

  // Same routes, auth and single-use rules as apps/web/src/app/api/v1/charges.
  const flupay = Fastify();
  flupay.addHook("onRequest", async (req, reply) => {
    if (req.headers.authorization !== `Bearer ${API_KEY}`) return reply.code(401).send({ error: "UNAUTHORIZED" });
  });
  flupay.post("/api/v1/charges", async (req, reply) => {
    const body = req.body as { amount: string; reference?: string };
    const id = `ch_${charges.size + 1}`;
    const incoming = `https://ilp.interledger-test.dev/merchant/incoming-payments/${id}`;
    const charge = { id, status: "pending", amount: toMinor(body.amount, 2).toString(), reference: body.reference ?? null, expires_at: new Date(Date.now() + 300_000).toISOString() };
    charges.set(incoming, charge);
    return reply.code(201).send({
      ...charge,
      asset_code: "COP",
      asset_scale: 2,
      price: `${body.amount}.00 COP`,
      description: null,
      incoming_url: incoming,
      payment_required: JSON.stringify({ wallet: "https://ilp.interledger-test.dev/merchant", incoming, amount: charge.amount, assetCode: "COP", assetScale: 2, expiresAt: charge.expires_at }),
    });
  });
  flupay.post("/api/v1/charges/verify", async (req) => {
    const url = String((req.body as { authorization: string }).authorization).replace(/^OpenPayments /, "");
    const charge = charges.get(url);
    const serialized = charge && { ...charge, asset_code: "COP", asset_scale: 2, incoming_url: url };
    if (!charge) return { valid: false, reason: "unknown_charge", charge: null };
    if (charge.status === "consumed") return { valid: false, reason: "already_used", charge: serialized };
    if (charge.status !== "paid") return { valid: false, reason: "not_paid", charge: serialized };
    charge.status = "consumed";
    return { valid: true, reason: null, charge: { ...serialized, status: "consumed" } };
  });

  const upstreamUrl = await upstream.listen({ port: 0, host: "127.0.0.1" });
  const flupayUrl = await flupay.listen({ port: 0, host: "127.0.0.1" });
  servers.push(upstream, flupay);

  // Shipped gateway.yaml, pointed at the test upstream.
  const config = loadConfig({ GATEWAY_CONFIG_PATH: "./gateway.yaml", GATEWAY_FLUPAY_API_KEY: API_KEY, GATEWAY_FLUPAY_URL: flupayUrl });
  const gateway = await buildApp({ ...config, upstream: upstreamUrl }, createFlupayClient(config.flupayUrl, config.flupayApiKey), { logger: false });
  gatewayUrl = await gateway.listen({ port: 0, host: "127.0.0.1" });
  servers.push(gateway);
});

after(async () => {
  await Promise.all(servers.map((s) => s.close()));
});

test("agent: 402, pay, retry with proof, 200; the proof works only once", async () => {
  const headers = { "x-agent-id": "agent-e2e", "user-agent": "node" };
  const first = await fetch(`${gatewayUrl}/api/weather`, { headers });
  assert.equal(first.status, 402);
  const required = parsePaymentRequiredHeader(first.headers.get("payment-required"));
  assert.ok(required);
  assert.equal(required.amount, "5000"); // 50 COP at scale 2

  charges.get(required.incoming)!.status = "paid"; // the agent wallet's outgoing payment

  const authorization = buildPaymentAuthorization(required.incoming);
  const second = await fetch(`${gatewayUrl}/api/weather`, { headers: { ...headers, authorization } });
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("payment-receipt"), required.incoming);
  assert.deepEqual(await second.json(), { city: "Medellín", temperature_c: 24 });

  const third = await fetch(`${gatewayUrl}/api/weather`, { headers: { ...headers, authorization } });
  assert.equal(third.status, 402);
  assert.equal(((await third.json()) as { rejected: string }).rejected, "already_used");
});

test("free route and browsers do not reach FluPay", async () => {
  const before = charges.size;
  assert.equal((await fetch(`${gatewayUrl}/`)).status, 200);
  const browser = await fetch(`${gatewayUrl}/api/weather`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0", "accept-language": "es-CO" },
  });
  assert.equal(browser.status, 200);
  assert.equal(charges.size, before);
});
