import assert from "node:assert/strict";
import { test } from "node:test";
import { createFlupayClient, FlupayError } from "./flupay.js";

function recordingFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: URL, init: RequestInit) => {
    calls.push({ url: url.toString(), init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test("createCharge posts to /api/v1/charges with the merchant key", async () => {
  const { calls, fetchImpl } = recordingFetch(201, { id: "ch_1" });
  const client = createFlupayClient("https://useflupay.space", "sk_abc", fetchImpl);
  const charge = await client.createCharge({ amount: "50", reference: "/api/*", agentHint: "a1" });
  assert.equal(charge.id, "ch_1");
  assert.equal(calls[0]!.url, "https://useflupay.space/api/v1/charges");
  assert.equal((calls[0]!.init.headers as Record<string, string>).authorization, "Bearer sk_abc");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { amount: "50", reference: "/api/*", agent_hint: "a1" });
});

test("verify posts the raw Authorization value", async () => {
  const { calls, fetchImpl } = recordingFetch(200, { valid: false, reason: "not_paid", charge: null });
  const client = createFlupayClient("https://useflupay.space", "sk_abc", fetchImpl);
  const result = await client.verify("OpenPayments https://x/ip/1");
  assert.equal(result.valid, false);
  assert.equal(calls[0]!.url, "https://useflupay.space/api/v1/charges/verify");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { authorization: "OpenPayments https://x/ip/1" });
});

test("non-2xx answers throw FlupayError with the status", async () => {
  const { fetchImpl } = recordingFetch(401, { error: "UNAUTHORIZED" });
  const client = createFlupayClient("https://useflupay.space", "sk_bad", fetchImpl);
  await assert.rejects(client.createCharge({ amount: "50" }), (err: unknown) => err instanceof FlupayError && err.status === 401);
});
