import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { formatAmount, normalizeWalletAddress } from "@flupay/shared";
import { db } from "./db.js";
import { env, opCredentials } from "./env.js";
import { WalletError } from "./errors.js";
import type { Agent } from "./generated/prisma/client.js";
import { listActivity } from "./activity.js";
import { allowedMerchantsOf, createAgent, getAgentOrThrow, rotateMcpKey } from "./services/agents.js";
import { finishGrant, revokeGrant, startGrant } from "./services/grants.js";
import { getBalance } from "./services/payments.js";

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'Decimal amount, e.g. "0.05"');

/** Public view of an agent: no key hash, no tokens. */
function publicAgent(agent: Agent) {
  return {
    id: agent.id,
    owner_id: agent.ownerId,
    name: agent.name,
    wallet_address: agent.walletAddress,
    asset_code: agent.assetCode,
    asset_scale: agent.assetScale,
    max_price: formatAmount({ value: BigInt(agent.maxPriceMinor), assetCode: agent.assetCode, assetScale: agent.assetScale }),
    allowed_merchants: allowedMerchantsOf(agent),
    created_at: agent.createdAt,
  };
}

/** Routes reachable without the admin key: health, the owner's browser callback and MCP (own auth). */
const PUBLIC_ROUTES = new Set(["/health", "/grants/callback", "/mcp"]);

function isAdmin(req: FastifyRequest): boolean {
  const expected = env.AGENT_WALLET_ADMIN_KEY;
  if (!expected) return true; // local development without a key
  const given = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function registerRoutes(app: FastifyInstance): void {
  app.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0] ?? "";
    if (PUBLIC_ROUTES.has(path) || req.method === "OPTIONS") return;
    if (!isAdmin(req)) return reply.code(401).send({ error: "UNAUTHORIZED", message: "Admin key required" });
  });

  app.post("/owners", async (req, reply) => {
    const body = z.object({ name: z.string().min(1), email: z.email().optional() }).parse(req.body);
    const owner = await db.owner.create({ data: { name: body.name, email: body.email } });
    return reply.code(201).send({ id: owner.id, name: owner.name });
  });

  app.get("/health", async () => ({ ok: true, open_payments_configured: opCredentials() !== null }));

  app.post("/agents", async (req, reply) => {
    const body = z
      .object({
        name: z.string().min(1),
        wallet_address: z.string().transform(normalizeWalletAddress).pipe(z.url()),
        max_price: decimal,
        allowed_merchants: z.array(z.string().transform(normalizeWalletAddress).pipe(z.url())).default([]),
        owner_id: z.string().optional(),
        owner_name: z.string().min(1).default("Demo owner"),
        owner_email: z.email().optional(),
      })
      .parse(req.body);
    const { agent, mcpApiKey } = await createAgent({
      name: body.name,
      walletAddress: body.wallet_address,
      maxPrice: body.max_price,
      allowedMerchants: body.allowed_merchants,
      owner: body.owner_id ? { id: body.owner_id } : { name: body.owner_name, email: body.owner_email },
    });
    // The key is returned once; only its hash is stored.
    return reply.code(201).send({ agent: publicAgent(agent), mcp_api_key: mcpApiKey });
  });

  app.get("/agents", async (req) => {
    const { owner_id } = z.object({ owner_id: z.string().optional() }).parse(req.query);
    const agents = await db.agent.findMany({ where: owner_id ? { ownerId: owner_id } : {}, orderBy: { createdAt: "desc" } });
    return Promise.all(agents.map(async (agent) => ({ ...publicAgent(agent), balance: await getBalance(agent) })));
  });

  app.get("/agents/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const agent = await getAgentOrThrow(id);
    return { ...publicAgent(agent), balance: await getBalance(agent) };
  });

  // Issues a new MCP key for the agent; the previous one stops working.
  app.post("/agents/:id/key", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { mcpApiKey } = await rotateMcpKey(id);
    return reply.code(201).send({ mcp_api_key: mcpApiKey });
  });

  app.post("/agents/:id/grants", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z
      .object({
        budget: decimal,
        period: z.string().regex(/^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/).default("P1M"),
      })
      .parse(req.body);
    const { grantId, redirectUrl } = await startGrant(id, body);
    return reply.code(201).send({ grant_id: grantId, redirect_url: redirectUrl });
  });

  app.delete("/agents/:id/grants", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await revokeGrant(id);
    return reply.code(204).send();
  });

  // The owner's browser lands here after approving (or denying) in the test wallet.
  app.get("/grants/callback", async (req, reply) => {
    const query = z
      .object({
        grant_id: z.string(),
        interact_ref: z.string().optional(),
        hash: z.string().optional(),
        result: z.string().optional(),
      })
      .parse(req.query);
    const target = new URL("/agents", env.DASHBOARD_URL);
    try {
      const grant = await finishGrant({
        grantId: query.grant_id,
        interactRef: query.interact_ref,
        hash: query.hash,
        result: query.result,
      });
      target.pathname = `/agents/${grant.agentId}`;
      target.searchParams.set("grant", grant.status);
    } catch (err) {
      req.log.error({ err }, "grant callback failed");
      target.searchParams.set("grant", "error");
      if (err instanceof WalletError) target.searchParams.set("code", err.code);
    }
    return reply.redirect(target.toString());
  });

  app.get("/payments", async (req) => {
    const { agent_id } = z.object({ agent_id: z.string().optional() }).parse(req.query);
    const payments = await db.payment.findMany({
      where: agent_id ? { agentId: agent_id } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { agent: { select: { assetCode: true, assetScale: true } } },
    });
    return payments.map(({ agent, ...p }) => ({
      id: p.id,
      agent_id: p.agentId,
      target_url: p.targetUrl,
      merchant_wallet: p.merchantWallet,
      price: formatAmount({ value: BigInt(p.priceMinor), ...agent }),
      debit: p.debitMinor === null ? null : formatAmount({ value: BigInt(p.debitMinor), ...agent }),
      status: p.status,
      error_code: p.errorCode,
      created_at: p.createdAt,
    }));
  });

  // Feed for the live demo console.
  app.get("/activity", async (req) => {
    const { agent_id, since } = z.object({ agent_id: z.string().optional(), since: z.string().optional() }).parse(req.query);
    return listActivity(agent_id, since);
  });
}
