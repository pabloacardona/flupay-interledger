import { readFileSync } from "node:fs";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().optional(),
  AGENT_WALLET_PORT: z.coerce.number().int().default(4000),
  /** Pooled Postgres URL (Neon, provisioned through the Vercel Marketplace). */
  DATABASE_URL: z.string().min(1),
  AGENT_WALLET_PUBLIC_URL: z.url().default("http://localhost:4000"),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "ENCRYPTION_KEY must be 32 bytes hex (openssl rand -hex 32)"),
  DASHBOARD_URL: z.url().default("http://localhost:3001"),
  /** Max time to wait for an outgoing payment to settle. */
  PAYMENT_TIMEOUT_MS: z.coerce.number().int().default(15_000),
  // Open Payments client identity. Optional at boot so the service can start
  // (health, MCP handshake) before keys exist; required when Open Payments is called.
  AGENT_WALLET_CLIENT_WALLET_ADDRESS: z.url().optional(),
  AGENT_WALLET_CLIENT_KEY_ID: z.string().min(1).optional(),
  /** PEM contents or base64 of the PEM. Preferred on Vercel. */
  AGENT_WALLET_CLIENT_PRIVATE_KEY: z.string().min(1).optional(),
  /** Path to the PEM file. Convenient locally. */
  AGENT_WALLET_CLIENT_PRIVATE_KEY_PATH: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export interface OpCredentials {
  walletAddressUrl: string;
  keyId: string;
  privateKey: string;
}

/** Resolves the Open Payments client credentials, or null when not configured. */
export function opCredentials(): OpCredentials | null {
  const { AGENT_WALLET_CLIENT_WALLET_ADDRESS: walletAddressUrl, AGENT_WALLET_CLIENT_KEY_ID: keyId } = env;
  let privateKey: string | undefined;
  if (env.AGENT_WALLET_CLIENT_PRIVATE_KEY) {
    const raw = env.AGENT_WALLET_CLIENT_PRIVATE_KEY.trim();
    privateKey = raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
  } else if (env.AGENT_WALLET_CLIENT_PRIVATE_KEY_PATH) {
    privateKey = readFileSync(env.AGENT_WALLET_CLIENT_PRIVATE_KEY_PATH, "utf8");
  }
  if (!walletAddressUrl || !keyId || !privateKey) return null;
  return { walletAddressUrl, keyId, privateKey };
}
