import { randomToken, sha256, toMinor } from "@flupay/shared";
import { db } from "../db.js";
import { WalletError, ErrorCode } from "../errors.js";
import { describeOpError, op } from "../op.js";
import type { Agent } from "../generated/prisma/client.js";

export interface CreateAgentInput {
  name: string;
  walletAddress: string;
  /** Decimal string in the agent's asset, e.g. "0.05". */
  maxPrice: string;
  allowedMerchants: string[];
  owner: { name: string; email?: string };
}

/** Registers an agent and returns its MCP API key. The key is shown only once. */
export async function createAgent(input: CreateAgentInput): Promise<{ agent: Agent; mcpApiKey: string }> {
  const client = await op();
  let wallet;
  try {
    wallet = await client.walletAddress.get({ url: input.walletAddress });
  } catch (err) {
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Wallet address lookup failed: ${describeOpError(err)}`);
  }

  const mcpApiKey = `fpk_${randomToken(24)}`;
  const owner = await db.owner.create({ data: { name: input.owner.name, email: input.owner.email } });
  const agent = await db.agent.create({
    data: {
      ownerId: owner.id,
      name: input.name,
      walletAddress: wallet.id,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      mcpApiKeyHash: sha256(mcpApiKey),
      maxPriceMinor: Number(toMinor(input.maxPrice, wallet.assetScale)),
      allowedMerchants: JSON.stringify(input.allowedMerchants),
    },
  });
  return { agent, mcpApiKey };
}

export async function getAgentOrThrow(agentId: string): Promise<Agent> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new WalletError(ErrorCode.NOT_FOUND, "Agent not found", 404);
  return agent;
}

/** Resolves the agent that owns an MCP API key, or null. Lookup is by hash. */
export function findAgentByApiKey(apiKey: string): Promise<Agent | null> {
  return db.agent.findUnique({ where: { mcpApiKeyHash: sha256(apiKey) } });
}

export function allowedMerchantsOf(agent: Agent): string[] {
  try {
    const parsed: unknown = JSON.parse(agent.allowedMerchants);
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === "string") : [];
  } catch {
    return [];
  }
}
