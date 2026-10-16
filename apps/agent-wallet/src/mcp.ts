import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { parsePaymentRequiredHeader, toMinor } from "@flupay/shared";
import { ErrorCode, WalletError } from "./errors.js";
import type { Agent } from "./generated/prisma/client.js";
import { findAgentByApiKey } from "./services/agents.js";
import { getBalance, paidFetch, pay } from "./services/payments.js";
import { randomUUID } from "node:crypto";

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'Decimal amount in the wallet currency, e.g. "0.05"');

/** Tool results never include tokens, manage URLs or keys. */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(err: unknown) {
  const error =
    err instanceof WalletError ? err : new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, "Unexpected error while paying");
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(error.toJSON()) }] };
}

function buildServer(agent: Agent): McpServer {
  const server = new McpServer({ name: "flupay-agent-wallet", version: "0.1.0" });

  server.registerTool(
    "paid_fetch",
    {
      title: "Fetch a paid URL",
      description:
        "Fetches a URL. If the server answers HTTP 402 Payment Required, pays it with Open Payments from this agent's wallet " +
        "(only if the price is at most max_price and within the owner's cap) and retries. Returns the final status and body, " +
        "what was paid, and the remaining budget for the period.",
      inputSchema: {
        url: z.url().describe("Absolute URL to fetch"),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("HTTP method, default GET"),
        body: z.string().optional().describe("Request body (JSON string or text)"),
        max_price: decimal.describe("Maximum price you accept for this request, e.g. \"0.05\""),
      },
    },
    async ({ url, method, body, max_price }) => {
      try {
        return ok(await paidFetch(agent, { url, method, body, maxPrice: max_price }));
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    "pay",
    {
      title: "Pay a specific charge",
      description:
        "Pays one Open Payments charge described by the Payment-Required header of a 402 response. " +
        "Use it when you received a 402 outside paid_fetch. Paying the same charge twice is a no-op.",
      inputSchema: {
        payment_required: z.string().describe("The raw JSON value of the Payment-Required header"),
        max_price: decimal.describe("Maximum price you accept, e.g. \"0.05\""),
      },
    },
    async ({ payment_required, max_price }) => {
      try {
        const charge = parsePaymentRequiredHeader(payment_required);
        if (!charge) throw new WalletError(ErrorCode.INVALID_PAYMENT_REQUIRED);
        const maxPriceMinor = toMinor(max_price, agent.assetScale);
        const capped = maxPriceMinor < BigInt(agent.maxPriceMinor) ? maxPriceMinor : BigInt(agent.maxPriceMinor);
        const { payment, alreadyPaid } = await pay(agent, charge, {
          maxPriceMinor: capped,
          targetUrl: charge.incoming,
          requestId: randomUUID(),
        });
        return ok({
          status: payment.status,
          already_paid: alreadyPaid,
          authorization: `OpenPayments ${charge.incoming}`,
          remaining_budget: (await getBalance(agent).catch(() => null))?.remaining ?? null,
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    "get_balance",
    {
      title: "Spending cap and balance",
      description: "Returns the owner's spending cap for the current period, how much was spent and how much remains.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await getBalance(agent));
      } catch (err) {
        return toolError(err);
      }
    },
  );

  return server;
}

/**
 * Streamable HTTP MCP endpoint, stateless: one server per request, bound to the
 * agent identified by the `x-agent-key` header.
 */
/**
 * Streamable HTTP MCP endpoint, stateless: one server per request, bound to the agent.
 * The agent key goes in the `x-agent-key` header, or in the path (`/mcp/<key>`) for
 * clients that only accept a URL, like Claude's custom connectors.
 */
export function registerMcp(app: FastifyInstance): void {
  const handle = async (req: FastifyRequest, reply: FastifyReply, key: unknown) => {
    const agent = typeof key === "string" && key.length > 0 ? await findAgentByApiKey(key) : null;
    if (!agent) {
      return reply.code(401).send({ jsonrpc: "2.0", error: { code: -32001, message: "Invalid or missing agent key" }, id: null });
    }

    const server = buildServer(agent);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    reply.hijack();
    await transport.handleRequest(req.raw, reply.raw, req.body);
  };

  app.post("/mcp", (req, reply) => handle(req, reply, req.headers["x-agent-key"]));
  app.post<{ Params: { key: string } }>("/mcp/:key", (req, reply) => handle(req, reply, req.params.key));

  const methodNotAllowed = { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed (stateless server)" }, id: null };
  for (const path of ["/mcp", "/mcp/:key"]) {
    app.get(path, (_req, reply) => reply.code(405).send(methodNotAllowed));
    app.delete(path, (_req, reply) => reply.code(405).send(methodNotAllowed));
  }
}
