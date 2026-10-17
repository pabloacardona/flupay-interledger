import { OpenPaymentsClientError, type AuthenticatedClient } from "@interledger/open-payments";
import { createOpClient } from "@flupay/shared";
import { opCredentials } from "./env.js";
import { ErrorCode, WalletError } from "./errors.js";

let client: Promise<AuthenticatedClient> | undefined;

/** Lazily created authenticated client for the agent-wallet service. */
export function op(): Promise<AuthenticatedClient> {
  if (!client) {
    const credentials = opCredentials();
    if (!credentials) {
      return Promise.reject(
        new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, "Open Payments client is not configured on this server", 503),
      );
    }
    client = createOpClient(credentials);
    client.catch(() => (client = undefined));
  }
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
