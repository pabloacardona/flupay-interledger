import "server-only";
import { randomToken, sha256 } from "@flupay/shared";
import type { AgentOwner } from "@/generated/prisma/client";
import { agentWallet, type WalletAgent } from "./agent-wallet";
import { db } from "./db";
import { ApiError, ApiErrorCode } from "./errors";

/** Creates an agent owner here and its owner record in the agent wallet service. */
export async function createOwner(input: { name: string; email?: string }) {
  const { id: walletOwnerId } = await agentWallet.createOwner(input.name, input.email);
  const ownerKey = `ok_${randomToken(24)}`;
  const owner = await db.agentOwner.create({
    data: {
      name: input.name,
      email: input.email || null,
      walletOwnerId,
      apiKeyHash: sha256(ownerKey),
      apiKeyLast4: ownerKey.slice(-4),
    },
  });
  return { owner, ownerKey };
}

export function findOwnerByKey(key: string): Promise<AgentOwner | null> {
  return db.agentOwner.findUnique({ where: { apiKeyHash: sha256(key) } });
}

/** Loads an agent and checks it belongs to the signed-in owner. */
export async function ownedAgent(owner: AgentOwner, agentId: string): Promise<WalletAgent> {
  const agent = await agentWallet.getAgent(agentId).catch(() => null);
  if (!agent || agent.owner_id !== owner.walletOwnerId) throw new ApiError(ApiErrorCode.NOT_FOUND, "Agent not found", 404);
  return agent;
}
