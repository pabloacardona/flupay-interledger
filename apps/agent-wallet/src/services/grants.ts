import { createHash } from "node:crypto";
import { isFinalizedGrantWithAccessToken, isPendingGrant } from "@interledger/open-payments";
import { decrypt, encrypt, randomToken, toMinor } from "@flupay/shared";
import { db } from "../db.js";
import { env } from "../env.js";
import { ErrorCode, WalletError } from "../errors.js";
import { describeOpError, isOpError, op } from "../op.js";
import type { Agent, Grant } from "../generated/prisma/client.js";
import { getAgentOrThrow } from "./agents.js";

const seal = (value: string) => encrypt(value, env.ENCRYPTION_KEY);
const unseal = (value: string) => decrypt(value, env.ENCRYPTION_KEY);

export interface StartGrantInput {
  /** Decimal string in the agent's asset, e.g. "0.20". */
  budget: string;
  /** ISO 8601 duration for the repeating interval. */
  period: string;
}

/**
 * Flow A, steps 2–3: asks the agent's auth server for an interactive
 * outgoing-payment grant with a spending cap. Returns the URL the owner opens to approve.
 */
export async function startGrant(agentId: string, input: StartGrantInput): Promise<{ grantId: string; redirectUrl: string }> {
  const agent = await getAgentOrThrow(agentId);
  const budgetMinor = toMinor(input.budget, agent.assetScale);
  const interval = `R/${new Date().toISOString()}/${input.period}`;
  const clientNonce = randomToken(16);
  // Created first so the callback URL can carry our grant id.
  const grantId = (
    await db.grant.create({
      data: {
        agentId,
        status: "pending",
        budgetMinor: Number(budgetMinor),
        interval,
        continueUri: "",
        continueToken: "",
        clientNonce,
        interactFinish: "",
      },
    })
  ).id;

  const client = await op();
  let pending;
  try {
    pending = await client.grant.request(
      { url: agent.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["create", "read", "list"],
              identifier: agent.walletAddress,
              limits: {
                debitAmount: { value: budgetMinor.toString(), assetCode: agent.assetCode, assetScale: agent.assetScale },
                interval,
              },
            },
          ],
        },
        interact: {
          start: ["redirect"],
          finish: {
            method: "redirect",
            uri: `${env.AGENT_WALLET_PUBLIC_URL}/grants/callback?grant_id=${grantId}`,
            nonce: clientNonce,
          },
        },
      },
    );
  } catch (err) {
    await db.grant.update({ where: { id: grantId }, data: { status: "rejected" } });
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Grant request failed: ${describeOpError(err)}`);
  }

  if (!isPendingGrant(pending)) {
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, "Expected an interactive grant from the auth server");
  }

  await db.grant.update({
    where: { id: grantId },
    data: {
      continueUri: pending.continue.uri,
      continueToken: seal(pending.continue.access_token.value),
      interactFinish: pending.interact.finish,
    },
  });
  return { grantId, redirectUrl: pending.interact.redirect };
}

/**
 * GNAP finish hash: base64(sha256(clientNonce \n serverFinish \n interactRef \n grantEndpoint)).
 * Accepts the auth server URL with or without a trailing slash.
 */
function isValidInteractHash(grant: Grant, agent: Agent, interactRef: string, hash: string): boolean {
  const endpoints = [agent.authServer.replace(/\/$/, ""), `${agent.authServer.replace(/\/$/, "")}/`];
  return endpoints.some((endpoint) => {
    const digest = createHash("sha256")
      .update(`${grant.clientNonce}\n${grant.interactFinish}\n${interactRef}\n${endpoint}`)
      .digest();
    return hash === digest.toString("base64") || hash === digest.toString("base64url");
  });
}

/** Flow A, step 4: the owner approved (or denied) in the wallet and came back here. */
export async function finishGrant(params: {
  grantId: string;
  interactRef?: string;
  hash?: string;
  result?: string;
}): Promise<Grant> {
  const grant = await db.grant.findUnique({ where: { id: params.grantId }, include: { agent: true } });
  if (!grant || grant.status !== "pending") throw new WalletError(ErrorCode.INVALID_CALLBACK, "Unknown or already finished grant");

  if (params.result === "grant_rejected" || !params.interactRef || !params.hash) {
    return db.grant.update({ where: { id: grant.id }, data: { status: "rejected" } });
  }
  if (!isValidInteractHash(grant, grant.agent, params.interactRef, params.hash)) {
    throw new WalletError(ErrorCode.INVALID_CALLBACK, "Interaction hash mismatch");
  }

  const client = await op();
  let finalized;
  try {
    finalized = await client.grant.continue(
      { url: grant.continueUri, accessToken: unseal(grant.continueToken) },
      { interact_ref: params.interactRef },
    );
  } catch (err) {
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Grant continuation failed: ${describeOpError(err)}`);
  }
  if (!isFinalizedGrantWithAccessToken(finalized)) {
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, "Grant was not finalized");
  }

  // One active grant per agent: revoke the previous one locally.
  await db.grant.updateMany({ where: { agentId: grant.agentId, status: "active" }, data: { status: "revoked" } });
  return db.grant.update({
    where: { id: grant.id },
    data: {
      status: "active",
      accessToken: seal(finalized.access_token.value),
      manageUrl: finalized.access_token.manage,
      continueUri: finalized.continue.uri,
      continueToken: seal(finalized.continue.access_token.value),
    },
  });
}

export function getActiveGrant(agentId: string): Promise<Grant | null> {
  return db.grant.findFirst({ where: { agentId, status: "active" }, orderBy: { createdAt: "desc" } });
}

export async function getActiveGrantOrThrow(agentId: string): Promise<Grant> {
  const grant = await getActiveGrant(agentId);
  if (!grant?.accessToken) throw new WalletError(ErrorCode.GRANT_INACTIVE);
  return grant;
}

/** Revokes the agent's active grant at the auth server and locally. */
export async function revokeGrant(agentId: string): Promise<void> {
  const grant = await getActiveGrantOrThrow(agentId);
  const client = await op();
  try {
    await client.grant.cancel({ url: grant.continueUri, accessToken: unseal(grant.continueToken) });
  } catch (err) {
    // Already gone at the auth server: still mark it revoked here.
    if (!isOpError(err) || err.status !== 404) {
      throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Grant revocation failed: ${describeOpError(err)}`);
    }
  }
  await db.grant.update({ where: { id: grant.id }, data: { status: "revoked" } });
}

/**
 * Runs `fn` with the grant's access token. On a 401, rotates the token once
 * (op.token.rotate) and retries.
 */
export async function withGrantToken<T>(grant: Grant, fn: (accessToken: string) => Promise<T>): Promise<T> {
  if (!grant.accessToken) throw new WalletError(ErrorCode.GRANT_INACTIVE);
  try {
    return await fn(unseal(grant.accessToken));
  } catch (err) {
    if (!isOpError(err) || err.status !== 401 || !grant.manageUrl) throw err;
    const client = await op();
    const rotated = await client.token.rotate({ url: grant.manageUrl, accessToken: unseal(grant.accessToken) });
    const updated = await db.grant.update({
      where: { id: grant.id },
      data: { accessToken: seal(rotated.access_token.value), manageUrl: rotated.access_token.manage },
    });
    return fn(unseal(updated.accessToken!));
  }
}
