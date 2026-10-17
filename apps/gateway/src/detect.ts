// Agent detection: decides whether a request comes from an AI agent (charged)
// or from a person in a browser (free, when gateway.yaml says `charge: agents`).
//
// User-Agent strings are easy to fake, so this is a policy, not a security boundary:
// a bot that pretends to be a browser gets in free. The stronger signals come first:
// an agent that sends X-Agent-Id or a payment proof has identified itself.
import { AGENT_ID_HEADER, parsePaymentAuthorization } from "@flupay/shared";
import type { IncomingHttpHeaders } from "node:http";

/** Published AI crawler and assistant user agents. */
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
  "cohere-ai",
  "MistralAI-User",
  "Diffbot",
];

/** Programmatic HTTP clients: what agents and scripts use when they do not say who they are. */
const HTTP_CLIENTS = /^(curl|wget|python-requests|python-httpx|aiohttp|axios|node|undici|node-fetch|got|go-http-client|okhttp|java|libwww-perl|httpie|postmanruntime|insomnia)\b/i;

export type Visitor = { agent: true; reason: string } | { agent: false; reason: "browser" };

export function detectVisitor(headers: IncomingHttpHeaders): Visitor {
  if (headers[AGENT_ID_HEADER]) return { agent: true, reason: "x-agent-id" };
  if (parsePaymentAuthorization(headers.authorization)) return { agent: true, reason: "payment-proof" };

  const userAgent = headers["user-agent"]?.trim() ?? "";
  if (!userAgent) return { agent: true, reason: "no-user-agent" };

  const lower = userAgent.toLowerCase();
  const known = AI_USER_AGENTS.find((name) => lower.includes(name.toLowerCase()));
  if (known) return { agent: true, reason: `ai-user-agent:${known}` };
  if (HTTP_CLIENTS.test(userAgent)) return { agent: true, reason: "http-client" };
  if (/\b(bot|crawler|spider|scraper)\b/i.test(userAgent)) return { agent: true, reason: "bot-user-agent" };

  // Real browsers send "Mozilla/5.0 ..." plus Accept-Language; scripts copying the UA often skip the latter.
  if (userAgent.startsWith("Mozilla/") && headers["accept-language"]) return { agent: false, reason: "browser" };
  return { agent: true, reason: "unknown-client" };
}
