import "server-only";
import { readFileSync } from "node:fs";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "ENCRYPTION_KEY must be 32 bytes hex"),
  PUBLIC_URL: z.url().default("http://localhost:3001"),
  /** Charge lifetime before the incoming payment expires. */
  CHARGE_TTL_SECONDS: z.coerce.number().int().default(300),
  /** Agent wallet service (MCP server) and its admin key, for the agent-owner side of the dashboard. */
  AGENT_WALLET_API_URL: z.url().default("https://mcp.useflupay.space"),
  AGENT_WALLET_MCP_URL: z.url().default("https://mcp.useflupay.space/mcp"),
  AGENT_WALLET_ADMIN_KEY: z.string().min(24).optional(),
  // Open Payments identity of the FluPay platform (signs grant requests).
  FLUPAY_CLIENT_WALLET_ADDRESS: z.url().optional(),
  FLUPAY_CLIENT_KEY_ID: z.string().min(1).optional(),
  /** PEM contents, or base64 of the PEM. */
  FLUPAY_CLIENT_PRIVATE_KEY: z.string().min(1).optional(),
  FLUPAY_CLIENT_PRIVATE_KEY_PATH: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export function opCredentials() {
  let privateKey: string | undefined;
  if (env.FLUPAY_CLIENT_PRIVATE_KEY) {
    const raw = env.FLUPAY_CLIENT_PRIVATE_KEY.trim();
    privateKey = raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
  } else if (env.FLUPAY_CLIENT_PRIVATE_KEY_PATH) {
    privateKey = readFileSync(env.FLUPAY_CLIENT_PRIVATE_KEY_PATH, "utf8");
  }
  if (!env.FLUPAY_CLIENT_WALLET_ADDRESS || !env.FLUPAY_CLIENT_KEY_ID || !privateKey) return null;
  return { walletAddressUrl: env.FLUPAY_CLIENT_WALLET_ADDRESS, keyId: env.FLUPAY_CLIENT_KEY_ID, privateKey };
}
