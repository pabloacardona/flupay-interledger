import { z } from "zod";

const envSchema = z.object({
  AGENT_WALLET_PORT: z.coerce.number().int().default(4000),
  AGENT_WALLET_DATABASE_URL: z.string().default("file:./agent-wallet.db"),
  AGENT_WALLET_PUBLIC_URL: z.url().default("http://localhost:4000"),
  AGENT_WALLET_CLIENT_WALLET_ADDRESS: z.url(),
  AGENT_WALLET_CLIENT_KEY_ID: z.string().min(1),
  AGENT_WALLET_CLIENT_PRIVATE_KEY_PATH: z.string().min(1),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "ENCRYPTION_KEY must be 32 bytes hex (openssl rand -hex 32)"),
  DASHBOARD_URL: z.url().default("http://localhost:3001"),
  /** Max time to wait for an outgoing payment to settle. */
  PAYMENT_TIMEOUT_MS: z.coerce.number().int().default(15_000),
});

export const env = envSchema.parse(process.env);
