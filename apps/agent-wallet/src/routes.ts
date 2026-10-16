import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatAmount } from "@flupay/shared";
import { db } from "./db.js";
import { env, opCredentials } from "./env.js";
import { WalletError } from "./errors.js";
import type { Agent } from "./generated/prisma/client.js";
import { listActivity } from "./activity.js";
import { allowedMerchantsOf, createAgent, getAgentOrThrow } from "./services/agents.js";
import { finishGrant, revokeGrant, startGrant } from "./services/grants.js";
import { getBalance } from "./services/payments.js";

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'Decimal amount, e.g. "0.05"');

/** Public view of an agent: no key hash, no tokens. */
function publicAgent(agent: Agent) {
  return {
    id: agent.id,
    name: agent.name,
    wallet_address: agent.walletAddress,
    asset_code: agent.assetCode,
    asset_scale: agent.assetScale,
    max_price: formatAmount({ value: BigInt(agent.maxPriceMinor), assetCode: agent.assetCode, assetScale: agent.assetScale }),
    allowed_merchants: allowedMerchantsOf(agent),
    created_at: agent.createdAt,
  };
}

export function registerRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({ ok: true, open_payments_configured: opCredentials() !== null }));

  app.post("/agents", async (req, reply) => {
    const body = z
      .object({
        name: z.string().min(1),
        wallet_address: z.url(),
        max_price: decimal,
        allowed_merchants: z.array(z.url()).default([]),
        owner_name: z.string().min(1).default("Demo owner"),
        owner_email: z.email().optional(),
      })
      .parse(req.body);
    const { agent, mcpApiKey } = await createAgent({
      name: body.name,
      walletAddress: body.wallet_address,
      maxPrice: body.max_price,
      allowedMerchants: body.allowed_merchants,
      owner: { name: body.owner_name, email: body.owner_email },
    });
    // The key is returned once; only its hash is stored.
    return reply.code(201).send({ agent: publicAgent(agent), mcp_api_key: mcpApiKey });
  });

  app.get("/agents", async () => {
    const agents = await db.agent.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(agents.map(async (agent) => ({ ...publicAgent(agent), balance: await getBalance(agent) })));
  });

  app.get("/agents/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const agent = await getAgentOrThrow(id);
    return { ...publicAgent(agent), balance: await getBalance(agent) };
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
    const target = new URL("/owner", env.DASHBOARD_URL);
    try {
      const grant = await finishGrant({
        grantId: query.grant_id,
        interactRef: query.interact_ref,
        hash: query.hash,
        result: query.result,
      });
      target.searchParams.set("agent", grant.agentId);
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
