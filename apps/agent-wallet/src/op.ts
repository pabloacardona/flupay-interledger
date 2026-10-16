import { OpenPaymentsClientError, type AuthenticatedClient } from "@interledger/open-payments";
import { createOpClient } from "@flupay/shared";
import { env } from "./env.js";

let client: Promise<AuthenticatedClient> | undefined;

/** Lazily created authenticated client for the agent-wallet service. */
export function op(): Promise<AuthenticatedClient> {
  client ??= createOpClient({
    walletAddressUrl: env.AGENT_WALLET_CLIENT_WALLET_ADDRESS,
    keyId: env.AGENT_WALLET_CLIENT_KEY_ID,
    privateKey: env.AGENT_WALLET_CLIENT_PRIVATE_KEY_PATH,
  });
  return client;
}

export function isOpError(err: unknown): err is OpenPaymentsClientError {
  return err instanceof OpenPaymentsClientError;
}

/** Short, token-free description of an SDK error for logs and error codes. */
export function describeOpError(err: unknown): string {
  if (isOpError(err)) return `${err.status ?? "?"} ${err.code ?? ""} ${err.description}`.trim();
  return err instanceof Error ? err.message : String(err);
}
