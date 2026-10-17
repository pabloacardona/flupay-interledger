// Paywall hook: decides, for every request, whether it passes, gets a 402, or
// carries a valid proof of payment.
//
//   free route                      -> pass
//   priced route, no proof          -> create charge, answer 402 + Payment-Required
//   priced route, valid proof       -> consume charge, pass with Payment-Receipt
//   priced route, invalid proof     -> fresh 402 (with the reason)
import {
  AGENT_ID_HEADER,
  PAYMENT_RECEIPT_HEADER,
  PAYMENT_REQUIRED_HEADER,
  parsePaymentAuthorization,
  toMinor,
} from "@flupay/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Price, RouteRule } from "./config.js";
import { FlupayError, type Charge, type ChargesApi } from "./flupay.js";
import { priceFor } from "./pricing.js";

/** Gateway's own endpoints are never charged. */
export const GATEWAY_PREFIX = "/_gateway/";

/**
 * A proof only unlocks the route it was issued for: same route pattern (stored as the
 * charge reference), same currency, and at least the configured price.
 */
export function chargeCovers(charge: Charge, rule: RouteRule, price: Price): boolean {
  if (charge.reference !== rule.path || charge.asset_code !== price.currency) return false;
  try {
    return BigInt(charge.amount) >= toMinor(price.amount, charge.asset_scale);
  } catch {
    return false; // price has more decimals than the merchant's asset scale
  }
}

export function createPaywall(routes: RouteRule[], flupay: ChargesApi) {
  return async function paywall(req: FastifyRequest, reply: FastifyReply) {
    if (req.url.startsWith(GATEWAY_PREFIX)) return;
    const { rule, price } = priceFor(routes, req.url);
    if (!rule || !price) return; // free

    try {
      let rejected: string | null = null;
      const authorization = req.headers.authorization;
      if (parsePaymentAuthorization(authorization)) {
        const result = await flupay.verify(authorization!);
        if (result.valid && chargeCovers(result.charge, rule, price)) {
          // The upstream does not understand our proof; never forward it.
          delete req.headers.authorization;
          reply.header(PAYMENT_RECEIPT_HEADER, result.charge.incoming_url);
          req.log.info({ charge: result.charge.id, route: rule.path }, "paid request");
          return;
        }
        rejected = result.valid ? "wrong_route_or_price" : result.reason;
        req.log.warn({ route: rule.path, reason: rejected }, "payment proof rejected");
      }

      const agentHint = req.headers[AGENT_ID_HEADER];
      const charge = await flupay.createCharge({
        amount: price.amount,
        description: `${req.method} ${req.url.split("?")[0]}`.slice(0, 200),
        reference: rule.path,
        agentHint: typeof agentHint === "string" ? agentHint.slice(0, 100) : undefined,
      });
      if (charge.asset_code !== price.currency) {
        req.log.error({ configured: price.currency, merchant: charge.asset_code }, "gateway.yaml currency differs from the merchant wallet");
        return reply.code(500).send({ error: "gateway_misconfigured", message: "Route currency does not match the merchant wallet" });
      }

      return reply
        .code(402)
        .header(PAYMENT_REQUIRED_HEADER, charge.payment_required)
        .send({ error: "payment_required", price: charge.price, incoming: charge.incoming_url, ...(rejected && { rejected }) });
    } catch (err) {
      if (!(err instanceof FlupayError)) throw err;
      req.log.error({ err: err.message }, "FluPay charges API failed");
      return reply.code(502).send({ error: "payment_provider_unavailable" });
    }
  };
}
