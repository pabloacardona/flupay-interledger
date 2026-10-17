import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadConfig } from "./config.js";

function withYaml(yaml: string, extraEnv: NodeJS.ProcessEnv = {}) {
  const path = join(mkdtempSync(join(tmpdir(), "gateway-")), "gateway.yaml");
  writeFileSync(path, yaml);
  return loadConfig({ GATEWAY_CONFIG_PATH: path, GATEWAY_FLUPAY_API_KEY: "sk_test", ...extraEnv });
}

test("loads the shipped gateway.yaml", () => {
  const config = loadConfig({ GATEWAY_CONFIG_PATH: "./gateway.yaml", GATEWAY_FLUPAY_API_KEY: "sk_test" });
  assert.equal(config.port, 8080);
  assert.equal(config.flupayUrl, "https://useflupay.space");
  assert.deepEqual(
    config.routes.map((r) => r.path),
    ["/api/premium/*", "/api/*", "/*"],
  );
  assert.equal(config.routes.at(-1)?.price, null);
});

test("an empty GATEWAY_ADMIN_KEY (copied .env.example) disables stats", () => {
  const config = withYaml("upstream: http://x\nroutes:\n  - path: /a\n    price: free\n", { GATEWAY_ADMIN_KEY: "" });
  assert.equal(config.adminKey, null);
  assert.equal(config.charge, "agents");
});

test("parses prices into amount and currency", () => {
  const config = withYaml("upstream: http://localhost:3000\nroutes:\n  - path: /a\n    price: 0.05 USD\n");
  assert.deepEqual(config.routes[0]?.price, { amount: "0.05", currency: "USD" });
});

test("rejects invalid prices, paths and keys", () => {
  assert.throws(() => withYaml("upstream: http://x\nroutes:\n  - path: /a\n    price: 5\n"));
  assert.throws(() => withYaml("upstream: http://x\nroutes:\n  - path: /a\n    price: 0 USD\n"));
  assert.throws(() => withYaml("upstream: http://x\nroutes:\n  - path: /a*b\n    price: free\n"));
  assert.throws(() => withYaml("upstream: http://x\nroutes:\n  - path: /a\n    price: free\n", { GATEWAY_FLUPAY_API_KEY: "ok_owner" }));
});
