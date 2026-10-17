import assert from "node:assert/strict";
import { test } from "node:test";
import type { RouteRule } from "./config.js";
import { matchesPattern, priceFor } from "./pricing.js";

const routes: RouteRule[] = [
  { path: "/api/premium/*", price: { amount: "200", currency: "COP" } },
  { path: "/api/*", price: { amount: "50", currency: "COP" } },
  { path: "/*", price: null },
];

test("matchesPattern: exact and prefix patterns", () => {
  assert.equal(matchesPattern("/health", "/health"), true);
  assert.equal(matchesPattern("/health", "/health/x"), false);
  assert.equal(matchesPattern("/api/*", "/api/weather"), true);
  assert.equal(matchesPattern("/api/*", "/api"), true);
  assert.equal(matchesPattern("/api/*", "/apix"), false);
  assert.equal(matchesPattern("/*", "/"), true);
});

test("priceFor: first match wins", () => {
  assert.deepEqual(priceFor(routes, "/api/premium/report").price, { amount: "200", currency: "COP" });
  assert.deepEqual(priceFor(routes, "/api/weather?city=Cali").price, { amount: "50", currency: "COP" });
  assert.equal(priceFor(routes, "/").price, null);
});

test("priceFor: no matching rule means free", () => {
  const result = priceFor([{ path: "/api/*", price: { amount: "1", currency: "USD" } }], "/docs");
  assert.equal(result.rule, null);
  assert.equal(result.price, null);
});
