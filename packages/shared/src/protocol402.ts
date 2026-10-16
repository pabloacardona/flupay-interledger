import { z } from "zod";

/**
 * HTTP 402 contract between the gateway (seller) and the agent wallet (buyer).
 * Both sides import this file so they never diverge.
 */

export const PAYMENT_REQUIRED_HEADER = "payment-required";
export const PAYMENT_RECEIPT_HEADER = "payment-receipt";
export const AGENT_ID_HEADER = "x-agent-id";
export const AUTH_SCHEME = "OpenPayments";

/** JSON carried in the `Payment-Required` response header. Amounts are minor units. */
export const paymentRequiredSchema = z.object({
  wallet: z.url(),
  incoming: z.url(),
  amount: z.string().regex(/^\d+$/, "amount must be an integer in minor units"),
  assetCode: z.string().min(3).max(3),
  assetScale: z.number().int().min(0).max(18),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type PaymentRequired = z.infer<typeof paymentRequiredSchema>;

/** JSON body of a 402 response (informational; the header is the source of truth). */
export const paymentRequiredBodySchema = z.object({
  error: z.literal("payment_required"),
  price: z.string(),
  incoming: z.url(),
});
export type PaymentRequiredBody = z.infer<typeof paymentRequiredBodySchema>;

/** Parses the raw `Payment-Required` header. Returns null when missing or invalid. */
export function parsePaymentRequiredHeader(raw: string | null | undefined): PaymentRequired | null {
  if (!raw) return null;
  try {
    const parsed = paymentRequiredSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function formatPaymentRequiredHeader(payload: PaymentRequired): string {
  return JSON.stringify(paymentRequiredSchema.parse(payload));
}

/** `Authorization: OpenPayments <incoming payment url>` */
export function buildPaymentAuthorization(incomingUrl: string): string {
  return `${AUTH_SCHEME} ${incomingUrl}`;
}

/** Extracts the incoming payment URL from an `Authorization` header, or null. */
export function parsePaymentAuthorization(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [scheme, value, ...rest] = raw.trim().split(/\s+/);
  if (scheme !== AUTH_SCHEME || !value || rest.length > 0) return null;
  return z.url().safeParse(value).success ? value : null;
}
