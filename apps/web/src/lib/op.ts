import "server-only";
import { isFinalizedGrantWithAccessToken, OpenPaymentsClientError, type AuthenticatedClient } from "@interledger/open-payments";
import { createOpClient, decrypt, encrypt } from "@flupay/shared";
import { db } from "./db";
import { env, opCredentials } from "./env";
import { ApiError, ApiErrorCode } from "./errors";

let client: Promise<AuthenticatedClient> | undefined;

export function op(): Promise<AuthenticatedClient> {
  if (!client) {
    const credentials = opCredentials();
    if (!credentials) {
      return Promise.reject(new ApiError(ApiErrorCode.NOT_CONFIGURED, "Open Payments client is not configured", 503));
    }
    client = createOpClient(credentials);
    client.catch(() => (client = undefined));
  }
  return client;
}

export function describeOpError(err: unknown): string {
  if (err instanceof OpenPaymentsClientError) return `${err.status ?? "?"} ${err.description}`;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Non-interactive incoming-payment grant on a merchant's auth server.
 * Receiving money needs no approval from the merchant; FluPay only needs the wallet address.
 */
export async function incomingPaymentToken(authServer: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await db.platformToken.findUnique({ where: { authServer } });
    if (cached && cached.expiresAt.getTime() > Date.now() + 10_000) return decrypt(cached.accessToken, env.ENCRYPTION_KEY);
  }
  const c = await op();
  const grant = await c.grant.request(
    { url: authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new ApiError(ApiErrorCode.OPEN_PAYMENTS_ERROR, "Incoming-payment grant was not granted", 502);
  }
  const expiresAt = new Date(Date.now() + (grant.access_token.expires_in ?? 600) * 1000);
  const data = {
    accessToken: encrypt(grant.access_token.value, env.ENCRYPTION_KEY),
    manageUrl: grant.access_token.manage,
    expiresAt,
  };
  await db.platformToken.upsert({ where: { authServer }, create: { authServer, ...data }, update: data });
  return grant.access_token.value;
}

/** Runs fn with a cached token; on 401 gets a fresh grant and retries once. */
export async function withIncomingToken<T>(authServer: string, fn: (token: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await incomingPaymentToken(authServer));
  } catch (err) {
    if (!(err instanceof OpenPaymentsClientError) || err.status !== 401) throw err;
    return fn(await incomingPaymentToken(authServer, true));
  }
}
