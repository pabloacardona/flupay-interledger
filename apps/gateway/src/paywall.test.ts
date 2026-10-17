import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { parsePaymentRequiredHeader, toMinor } from "@flupay/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import type { RouteRule } from "./config.js";
import { FlupayError, type Charge, type ChargesApi, type CreateChargeInput } from "./flupay.js";

const routes: RouteRule[] = [
  { path: "/api/premium/*", price: { amount: "200", currency: "COP" } },
  { path: "/api/*", price: { amount: "50", currency: "COP" } },
  { path: "/*", price: null },
];

/** In-memory stand-in for apps/web's charges API, with the same single-use rules. */
class FakeFlupay implements ChargesApi {
  charges = new Map<string, Charge>();
  calls = { create: [] as CreateChargeInput[], verify: 0 };
  currency = "COP";
  down = false;

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    if (this.down) throw new FlupayError("FluPay unreachable", null);
    this.calls.create.push(input);
    const id = `ch_${this.charges.size + 1}`;
    const incoming = `https://ilp.interledger-test.dev/incoming-payments/${id}`;
    const amount = toMinor(input.amount, 2).toString();
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    const charge: Charge = {
      id,
      status: "pending",
      amount,
      asset_code: this.currency,
      asset_scale: 2,
      price: `${input.amount} ${this.currency}`,
      description: input.description ?? null,
      reference: input.reference ?? null,
      incoming_url: incoming,
      expires_at: expiresAt,
      payment_required: JSON.stringify({
        wallet: "https://ilp.interledger-test.dev/merchant",
        incoming,
        amount,
        assetCode: this.currency,
        assetScale: 2,
        expiresAt,
      }),
    };
    this.charges.set(incoming, charge);
    return charge;
  }

  /** Simulates the agent paying the incoming payment. */
  pay(incoming: string) {
    this.charges.get(incoming)!.status = "paid";
  }

  async verify(authorization: string) {
    this.calls.verify++;
    const charge = this.charges.get(authorization.replace(/^OpenPayments /, ""));
    if (!charge) return { valid: false as const, reason: "unknown_charge", charge: null };
    if (charge.status === "consumed") return { valid: false as const, reason: "already_used", charge };
    if (charge.status !== "paid") return { valid: false as const, reason: "not_paid", charge };
    charge.status = "consumed";
    return { valid: true as const, reason: null, charge };
  }
}

let upstream: FastifyInstance;
let gateway: FastifyInstance;
let flupay: FakeFlupay;
let upstreamUrl: string;

before(async () => {
  // Upstream that echoes what it received, to check what the gateway forwards.
  upstream = Fastify();
  upstream.get("/*", async (req) => ({ path: req.url, authorization: req.headers.authorization ?? null }));
  const address = await upstream.listen({ port: 0, host: "127.0.0.1" });
  flupay = new FakeFlupay();
  upstreamUrl = address;
  gateway = await buildApp({ upstream: address, routes, adminKey: "admin-key-0123456789" }, flupay, { logger: false });
});

after(async () => {
  await gateway.close();
  await upstream.close();
});

beforeEach(() => {
  flupay.charges.clear();
  flupay.calls = { create: [], verify: 0 };
  flupay.currency = "COP";
  flupay.down = false;
});

/** Requests a priced path, pays the charge from the 402 and returns the proof. */
async function paidProof(url: string): Promise<string> {
  const res = await gateway.inject({ url });
  assert.equal(res.statusCode, 402);
  const incoming = parsePaymentRequiredHeader(res.headers["payment-required"] as string)!.incoming;
  flupay.pay(incoming);
  return `OpenPayments ${incoming}`;
}

test("free route passes without creating a charge", async () => {
  const res = await gateway.inject({ url: "/" });
  assert.equal(res.statusCode, 200);
  assert.equal(flupay.calls.create.length, 0);
});

test("gateway endpoints are never charged", async () => {
  const res = await gateway.inject({ url: "/_gateway/health" });
  assert.equal(res.statusCode, 200);
  assert.equal(flupay.calls.create.length, 0);
});

test("priced route without proof answers 402 with a valid Payment-Required header", async () => {
  const res = await gateway.inject({ url: "/api/weather?city=Cali", headers: { "x-agent-id": "agent-1" } });
  assert.equal(res.statusCode, 402);
  const header = parsePaymentRequiredHeader(res.headers["payment-required"] as string);
  assert.ok(header, "Payment-Required must match the shared zod contract");
  assert.equal(header.amount, "5000");
  assert.equal(header.assetCode, "COP");
  assert.deepEqual(res.json(), { error: "payment_required", price: "50 COP", incoming: header.incoming });
  assert.deepEqual(flupay.calls.create[0], { amount: "50", description: "GET /api/weather", reference: "/api/*", agentHint: "agent-1" });
});

test("valid proof passes once, without leaking the proof upstream", async () => {
  const proof = await paidProof("/api/weather");
  const res = await gateway.inject({ url: "/api/weather", headers: { authorization: proof } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { path: "/api/weather", authorization: null });
  assert.equal(res.headers["payment-receipt"], proof.replace("OpenPayments ", ""));

  const reused = await gateway.inject({ url: "/api/weather", headers: { authorization: proof } });
  assert.equal(reused.statusCode, 402);
  assert.equal(reused.json().rejected, "already_used");
});

test("unpaid or unknown proof gets a fresh 402 with the reason", async () => {
  const unpaid = await gateway.inject({ url: "/api/weather" });
  const incoming = parsePaymentRequiredHeader(unpaid.headers["payment-required"] as string)!.incoming;
  const res = await gateway.inject({ url: "/api/weather", headers: { authorization: `OpenPayments ${incoming}` } });
  assert.equal(res.statusCode, 402);
  assert.equal(res.json().rejected, "not_paid");

  const unknown = await gateway.inject({ url: "/api/weather", headers: { authorization: "OpenPayments https://evil.example/ip/1" } });
  assert.equal(unknown.json().rejected, "unknown_charge");
});

test("a cheap route's proof does not unlock a premium route", async () => {
  const proof = await paidProof("/api/weather");
  const res = await gateway.inject({ url: "/api/premium/report", headers: { authorization: proof } });
  assert.equal(res.statusCode, 402);
  assert.equal(res.json().rejected, "wrong_route_or_price");
});

test("non-payment Authorization headers are ignored and forwarded on free routes", async () => {
  const res = await gateway.inject({ url: "/", headers: { authorization: "Bearer user-token" } });
  assert.equal(res.json().authorization, "Bearer user-token");
});

test("merchant currency different from gateway.yaml is a 500, not a wrong charge", async () => {
  flupay.currency = "USD";
  const res = await gateway.inject({ url: "/api/weather" });
  assert.equal(res.statusCode, 500);
  assert.equal(res.json().error, "gateway_misconfigured");
});

test("FluPay down answers 502", async () => {
  flupay.down = true;
  const res = await gateway.inject({ url: "/api/weather" });
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, "payment_provider_unavailable");
});

const browser = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  "accept-language": "es-CO,es;q=0.9",
};

test("people in a browser use priced routes for free with charge: agents", async () => {
  const res = await gateway.inject({ url: "/api/premium/report", headers: browser });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["x-flupay-visitor"], "human");
  assert.equal(flupay.calls.create.length, 0);
});

test("with charge: everyone, browsers pay too", async () => {
  const everyone = await buildApp({ upstream: upstreamUrl, routes, charge: "everyone" }, flupay, { logger: false });
  const res = await everyone.inject({ url: "/api/weather", headers: browser });
  assert.equal(res.statusCode, 402);
  await everyone.close();
});

test("unidentified agents get the detection signal as agent hint", async () => {
  const res = await gateway.inject({ url: "/api/weather", headers: { "user-agent": "curl/8.9.1" } });
  assert.equal(res.statusCode, 402);
  assert.equal(res.headers["x-flupay-visitor"], "agent");
  assert.equal(flupay.calls.create[0]?.agentHint, "http-client");
});

test("stats need the admin key and count revenue", async () => {
  const proof = await paidProof("/api/premium/report");
  await gateway.inject({ url: "/api/premium/report", headers: { authorization: proof } });

  assert.equal((await gateway.inject({ url: "/_gateway/stats" })).statusCode, 401);
  const res = await gateway.inject({ url: "/_gateway/stats", headers: { authorization: "Bearer admin-key-0123456789" } });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().paid >= 1);
  assert.match(res.json().revenue.COP, /^\d+\.\d{2}$/);
});
