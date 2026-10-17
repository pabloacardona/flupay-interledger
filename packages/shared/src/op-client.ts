import { createAuthenticatedClient, type AuthenticatedClient } from "@interledger/open-payments";

export interface OpClientConfig {
  /** Wallet address that identifies this service as a GNAP client. */
  walletAddressUrl: string;
  keyId: string;
  /** Path to the Ed25519 private key file, or the PEM contents. */
  privateKey: string;
}

/** Creates the authenticated Open Payments client for one service. */
export function createOpClient(config: OpClientConfig): Promise<AuthenticatedClient> {
  return createAuthenticatedClient({
    walletAddressUrl: config.walletAddressUrl,
    keyId: config.keyId,
    privateKey: config.privateKey,
    // Skip OpenAPI response validation: it reads YAML specs from node_modules at runtime,
    // and serverless bundles (Vercel /var/task) don't ship those files -> ENOENT.
    validateResponses: false,
  });
}
