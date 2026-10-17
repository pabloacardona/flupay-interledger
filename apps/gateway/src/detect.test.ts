import assert from "node:assert/strict";
import { test } from "node:test";
import { detectVisitor } from "./detect.js";

const chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

test("browsers with Accept-Language are people", () => {
  assert.deepEqual(detectVisitor({ "user-agent": chrome, "accept-language": "es-CO,es;q=0.9" }), { agent: false, reason: "browser" });
});

test("self-identified agents are agents even with a browser user agent", () => {
  assert.equal(detectVisitor({ "user-agent": chrome, "accept-language": "es", "x-agent-id": "a1" }).reason, "x-agent-id");
  assert.equal(
    detectVisitor({ "user-agent": chrome, "accept-language": "es", authorization: "OpenPayments https://x.dev/ip/1" }).reason,
    "payment-proof",
  );
});

test("known AI crawlers and assistants", () => {
  const ua = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
  assert.equal(detectVisitor({ "user-agent": ua, "accept-language": "en" }).reason, "ai-user-agent:ClaudeBot");
  assert.equal(detectVisitor({ "user-agent": "Mozilla/5.0; compatible; GPTBot/1.2" }).reason, "ai-user-agent:GPTBot");
});

test("scripts, generic bots and missing user agents are agents", () => {
  assert.equal(detectVisitor({ "user-agent": "curl/8.9.1" }).reason, "http-client");
  assert.equal(detectVisitor({ "user-agent": "python-requests/2.32" }).reason, "http-client");
  assert.equal(detectVisitor({ "user-agent": "SomeCrawler bot/1.0" }).reason, "bot-user-agent");
  assert.equal(detectVisitor({}).reason, "no-user-agent");
  assert.equal(detectVisitor({ "user-agent": chrome }).reason, "unknown-client");
});
