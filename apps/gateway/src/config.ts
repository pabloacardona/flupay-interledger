// Loads the gateway configuration: secrets and ports from the environment,
// upstream and route prices from gateway.yaml. Fails fast on any invalid value.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const envSchema = z.object({
  GATEWAY_PORT: z.coerce.number().int().default(8080),
  GATEWAY_CONFIG_PATH: z.string().default("./gateway.yaml"),
  /** FluPay merchant platform (apps/web) that creates and verifies charges. */
  GATEWAY_FLUPAY_URL: z.url().default("https://useflupay.space"),
  /** Merchant secret key (`sk_...`) from the FluPay dashboard, API keys section. */
  GATEWAY_FLUPAY_API_KEY: z.string().startsWith("sk_", "GATEWAY_FLUPAY_API_KEY must be a merchant key (sk_...)"),
});

/** "free", or a positive decimal amount plus an ISO 4217 code, e.g. "0.05 USD". */
const priceSchema = z.union([
  z.literal("free").transform(() => null),
  z
    .string()
    .regex(/^\d+(\.\d+)?\s+[A-Z]{3}$/, 'Price must be "free" or like "0.05 USD"')
    .transform((raw) => {
      const [amount, currency] = raw.trim().split(/\s+/) as [string, string];
      return { amount, currency };
    })
    .refine((price) => Number(price.amount) > 0, "Price must be greater than zero"),
]);

const routeSchema = z.object({
  // "/health", "/api/*" or "/*": starts with "/", and "*" is only allowed as a final "/*".
  path: z.string().regex(/^(\/[^*]*)?\/\*$|^\/[^*]*$/, 'Path must start with "/" and may only end in "/*"'),
  price: priceSchema,
});

const fileSchema = z.object({
  upstream: z.url(),
  routes: z.array(routeSchema).min(1),
});

export type Price = { amount: string; currency: string };
export type RouteRule = { path: string; price: Price | null };

export interface GatewayConfig {
  port: number;
  upstream: string;
  flupayUrl: string;
  flupayApiKey: string;
  routes: RouteRule[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const vars = envSchema.parse(env);
  const file = fileSchema.parse(parse(readFileSync(resolve(vars.GATEWAY_CONFIG_PATH), "utf8")));
  return {
    port: vars.GATEWAY_PORT,
    upstream: file.upstream,
    flupayUrl: vars.GATEWAY_FLUPAY_URL,
    flupayApiKey: vars.GATEWAY_FLUPAY_API_KEY,
    routes: file.routes,
  };
}
