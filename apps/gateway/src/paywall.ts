// Paywall hook: decides, for every request, whether it passes, gets a 402, or
// carries a valid proof of payment.
//
//   free route                      -> pass
//   person in a browser             -> pass (when gateway.yaml says `charge: agents`)
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
import type { ChargeMode, Price, RouteRule } from "./config.js";
import { detectVisitor } from "./detect.js";
import { FlupayError, type Charge, type ChargesApi } from "./flupay.js";
import { priceFor } from "./pricing.js";
import { GatewayStats } from "./stats.js";

/** Gateway's own endpoints are never charged. */
export const GATEWAY_PREFIX = "/_gateway/";

/** Tells the client how the gateway classified it: "agent" or "human". */
export const VISITOR_HEADER = "x-flupay-visitor";

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

export interface PaywallOptions {
  routes: RouteRule[];
  flupay: ChargesApi;
  charge?: ChargeMode;
  stats?: GatewayStats;
  /** Waits between verify attempts when the payment has not landed yet. */
  settleRetryMs?: number[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createPaywall({ routes, flupay, charge: mode = "agents", stats = new GatewayStats(), settleRetryMs = [1_000, 2_000] }: PaywallOptions) {
  return async function paywall(req: FastifyRequest, reply: FastifyReply) {
    if (req.url.startsWith(GATEWAY_PREFIX)) return;
    stats.requests++;
    const { rule, price } = priceFor(routes, req.url);
    if (!rule || !price) {
      stats.free++;
      return;
    }

    const visitor = detectVisitor(req.headers);
    reply.header(VISITOR_HEADER, visitor.agent ? "agent" : "human");
    if (!visitor.agent) {
      if (mode === "agents") {
        stats.humans++;
        return;
      }
    } else {
      stats.agent(visitor.reason);
    }

    try {
      let rejected: string | null = null;
      const authorization = req.headers.authorization;
      if (parsePaymentAuthorization(authorization)) {
        // "not_paid" does not consume the charge, so it is safe to ask again while the
        // agent's outgoing payment settles on the network.
        let result = await flupay.verify(authorization!);
        for (const wait of settleRetryMs) {
          if (result.valid || result.reason !== "not_paid") break;
          await sleep(wait);
          result = await flupay.verify(authorization!);
        }
        if (result.valid && chargeCovers(result.charge, rule, price)) {
          // The upstream does not understand our proof; never forward it.
          delete req.headers.authorization;
          reply.header(PAYMENT_RECEIPT_HEADER, result.charge.incoming_url);
          stats.paid++;
          stats.addRevenue(result.charge.amount, result.charge.asset_code, result.charge.asset_scale);
          req.log.info({ charge: result.charge.id, route: rule.path }, "paid request");
          return;
        }
        rejected = result.valid ? "wrong_route_or_price" : result.reason;
        stats.reject(rejected);
        req.log.warn({ route: rule.path, reason: rejected }, "payment proof rejected");
      }

      const agentHint = req.headers[AGENT_ID_HEADER];
      const charge = await flupay.createCharge({
        amount: price.amount,
        description: `${req.method} ${req.url.split("?")[0]}`.slice(0, 200),
        reference: rule.path,
        agentHint: (typeof agentHint === "string" ? agentHint : visitor.reason).slice(0, 100),
      });
      if (charge.asset_code !== price.currency) {
        req.log.error({ configured: price.currency, merchant: charge.asset_code }, "gateway.yaml currency differs from the merchant wallet");
        return reply.code(500).send({ error: "gateway_misconfigured", message: "Route currency does not match the merchant wallet" });
      }

      stats.paymentRequired++;
      return reply
        .code(402)
        .header(PAYMENT_REQUIRED_HEADER, charge.payment_required)
        .send({ error: "payment_required", price: charge.price, incoming: charge.incoming_url, ...(rejected && { rejected }) });
    } catch (err) {
      if (!(err instanceof FlupayError)) throw err;
      req.log.error({ err: err.message }, "FluPay charges API failed");
      // 503, not 502: tunnels and CDNs (Cloudflare) replace 502 bodies with their own HTML page.
      return reply.code(503).send({ error: "payment_provider_unavailable" });
    }
  };
}
