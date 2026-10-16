import { randomUUID } from "node:crypto";
import { isFinalizedGrantWithAccessToken } from "@interledger/open-payments";
import {
  AGENT_ID_HEADER,
  PAYMENT_REQUIRED_HEADER,
  buildPaymentAuthorization,
  formatAmount,
  parsePaymentRequiredHeader,
  rescale,
  toMinor,
  type PaymentRequired,
} from "@flupay/shared";
import { db } from "../db.js";
import { env } from "../env.js";
import { ErrorCode, WalletError } from "../errors.js";
import { describeOpError, isOpError, op } from "../op.js";
import { record } from "../activity.js";
import type { Agent, Payment } from "../generated/prisma/client.js";
import { allowedMerchantsOf } from "./agents.js";
import { getActiveGrant, getActiveGrantOrThrow, withGrantToken } from "./grants.js";

const POLL_INTERVAL_MS = 500;
const MAX_BODY_CHARS = 100_000;

const money = (agent: Agent, minor: bigint | number) =>
  formatAmount({ value: BigInt(minor), assetCode: agent.assetCode, assetScale: agent.assetScale });

// ---------------------------------------------------------------------------
// Quote grant (non-interactive), cached per agent until it expires.
// ---------------------------------------------------------------------------

const quoteTokens = new Map<string, { token: string; expiresAt: number }>();

async function quoteToken(agent: Agent): Promise<string> {
  const cached = quoteTokens.get(agent.id);
  if (cached && cached.expiresAt > Date.now() + 5_000) return cached.token;

  const client = await op();
  const grant = await client.grant.request(
    { url: agent.authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, "Quote grant was not granted non-interactively");
  }
  const ttlMs = (grant.access_token.expires_in ?? 600) * 1000;
  quoteTokens.set(agent.id, { token: grant.access_token.value, expiresAt: Date.now() + ttlMs });
  return grant.access_token.value;
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export interface Balance {
  status: "active" | "none";
  budget: string | null;
  spent: string | null;
  remaining: string | null;
  interval: string | null;
}

async function spentMinor(agent: Agent): Promise<bigint> {
  const grant = await getActiveGrantOrThrow(agent.id);
  const client = await op();
  try {
    const spent = await withGrantToken(grant, (accessToken) =>
      client.outgoingPayment.getGrantSpentAmounts({ url: agent.resourceServer, accessToken }),
    );
    return BigInt(spent.spentDebitAmount?.value ?? "0");
  } catch {
    // Fallback for display only; the wallet's own limit is what is enforced.
    const rows = await db.payment.findMany({
      where: { agentId: agent.id, status: "completed", createdAt: { gte: grant.createdAt } },
      select: { debitMinor: true },
    });
    return rows.reduce((sum, row) => sum + BigInt(row.debitMinor ?? 0), 0n);
  }
}

export async function getBalance(agent: Agent): Promise<Balance> {
  const grant = await getActiveGrant(agent.id);
  if (!grant?.accessToken) return { status: "none", budget: null, spent: null, remaining: null, interval: null };
  const spent = await spentMinor(agent);
  const budget = BigInt(grant.budgetMinor);
  const remaining = budget > spent ? budget - spent : 0n;
  return {
    status: "active",
    budget: money(agent, budget),
    spent: money(agent, spent),
    remaining: money(agent, remaining),
    interval: grant.interval,
  };
}

// ---------------------------------------------------------------------------
// Pay one incoming payment (Flow B, steps 3–5)
// ---------------------------------------------------------------------------

export interface PayResult {
  payment: Payment;
  /** True when this charge had already been paid; nothing new was sent. */
  alreadyPaid: boolean;
}

function checkLimits(agent: Agent, charge: PaymentRequired, maxPriceMinor: bigint): bigint {
  if (charge.assetCode !== agent.assetCode) {
    throw new WalletError(ErrorCode.ASSET_MISMATCH, `Merchant charges ${charge.assetCode}, wallet holds ${agent.assetCode}`);
  }
  const priceMinor = rescale(BigInt(charge.amount), charge.assetScale, agent.assetScale);
  if (priceMinor > maxPriceMinor) {
    throw new WalletError(
      ErrorCode.PRICE_EXCEEDS_MAX,
      `Price ${money(agent, priceMinor)} is higher than the maximum ${money(agent, maxPriceMinor)}. Nothing was charged.`,
    );
  }
  const allowed = allowedMerchantsOf(agent);
  if (allowed.length > 0 && !allowed.includes(charge.wallet)) {
    throw new WalletError(ErrorCode.MERCHANT_NOT_ALLOWED);
  }
  return priceMinor;
}

/** Marks the payment as failed with a typed code, then throws. */
async function fail(payment: Payment, error: WalletError): Promise<never> {
  const status = error.code === ErrorCode.BUDGET_EXCEEDED ? "rejected_budget" : "failed";
  await db.payment.update({ where: { id: payment.id }, data: { status, errorCode: error.code } });
  throw error;
}

async function waitForSettlement(agent: Agent, payment: Payment, charge: PaymentRequired, requestId: string): Promise<Payment> {
  const client = await op();
  const grant = await getActiveGrantOrThrow(agent.id);
  const deadline = Date.now() + env.PAYMENT_TIMEOUT_MS;
  const expected = BigInt(charge.amount);

  while (Date.now() < deadline) {
    try {
      const incoming = await client.incomingPayment.getPublic({ url: charge.incoming });
      if (incoming.receivedAmount && BigInt(incoming.receivedAmount.value) >= expected) {
        record({ agentId: agent.id, requestId, step: "payment_completed", detail: { incoming: charge.incoming } });
        return db.payment.update({ where: { id: payment.id }, data: { status: "completed", errorCode: null } });
      }
      if (payment.outgoingPaymentUrl) {
        const outgoing = await withGrantToken(grant, (accessToken) =>
          client.outgoingPayment.get({ url: payment.outgoingPaymentUrl!, accessToken }),
        );
        if (outgoing.failed) return fail(payment, new WalletError(ErrorCode.PAYMENT_NOT_CONFIRMED, "The outgoing payment failed"));
      }
    } catch (err) {
      if (err instanceof WalletError) throw err;
      // Transient read errors: keep polling until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return fail(payment, new WalletError(ErrorCode.PAYMENT_NOT_CONFIRMED));
}

export async function pay(
  agent: Agent,
  charge: PaymentRequired,
  opts: { maxPriceMinor: bigint; targetUrl: string; requestId: string },
): Promise<PayResult> {
  const { requestId } = opts;
  const priceMinor = checkLimits(agent, charge, opts.maxPriceMinor);
  const grant = await getActiveGrantOrThrow(agent.id);

  // Idempotency: a charge is paid at most once per agent.
  const existing = await db.payment.findUnique({
    where: { agentId_incomingUrl: { agentId: agent.id, incomingUrl: charge.incoming } },
  });
  if (existing?.status === "completed") {
    record({ agentId: agent.id, requestId, step: "payment_reused", detail: { incoming: charge.incoming } });
    return { payment: existing, alreadyPaid: true };
  }
  if (existing?.status === "sent") {
    return { payment: await waitForSettlement(agent, existing, charge, requestId), alreadyPaid: false };
  }

  const payment = existing
    ? await db.payment.update({ where: { id: existing.id }, data: { status: "quoted", errorCode: null } })
    : await db.payment.create({
        data: {
          agentId: agent.id,
          targetUrl: opts.targetUrl,
          incomingUrl: charge.incoming,
          merchantWallet: charge.wallet,
          priceMinor: Number(priceMinor),
          status: "quoted",
        },
      });

  const client = await op();

  // 1. Quote: how much leaves the agent's wallet to pay this incoming payment.
  let quote;
  try {
    quote = await client.quote.create(
      { url: agent.resourceServer, accessToken: await quoteToken(agent) },
      { walletAddress: agent.walletAddress, receiver: charge.incoming, method: "ilp" },
    );
  } catch (err) {
    return fail(payment, new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Quote failed: ${describeOpError(err)}`));
  }
  const debitMinor = BigInt(quote.debitAmount.value);
  await db.payment.update({ where: { id: payment.id }, data: { quoteUrl: quote.id, debitMinor: Number(debitMinor) } });
  record({ agentId: agent.id, requestId, step: "quote_created", detail: { debit: money(agent, debitMinor) } });

  // 2. Budget pre-check, so the agent gets a clear BUDGET_EXCEEDED before anything is sent.
  const spent = await spentMinor(agent);
  if (spent + debitMinor > BigInt(grant.budgetMinor)) {
    record({ agentId: agent.id, requestId, step: "budget_exceeded", detail: { spent: money(agent, spent) } });
    return fail(payment, new WalletError(ErrorCode.BUDGET_EXCEEDED));
  }

  // 3. Outgoing payment under the owner's capped grant.
  let outgoing;
  try {
    outgoing = await withGrantToken(grant, (accessToken) =>
      client.outgoingPayment.create(
        { url: agent.resourceServer, accessToken },
        { walletAddress: agent.walletAddress, quoteId: quote.id, metadata: { targetUrl: opts.targetUrl, requestId } },
      ),
    );
  } catch (err) {
    // The wallet enforces the cap; a 403 here means the grant's limit is used up.
    const overBudget = isOpError(err) && (err.status === 403 || /limit|insufficient/i.test(err.description));
    return fail(
      payment,
      overBudget
        ? new WalletError(ErrorCode.BUDGET_EXCEEDED)
        : new WalletError(ErrorCode.OPEN_PAYMENTS_ERROR, `Outgoing payment failed: ${describeOpError(err)}`),
    );
  }
  const sent = await db.payment.update({
    where: { id: payment.id },
    data: { status: "sent", outgoingPaymentUrl: outgoing.id },
  });
  record({ agentId: agent.id, requestId, step: "payment_sent", detail: { amount: money(agent, debitMinor) } });

  return { payment: await waitForSettlement(agent, sent, charge, requestId), alreadyPaid: false };
}

// ---------------------------------------------------------------------------
// Paid fetch (Flow B end to end)
// ---------------------------------------------------------------------------

export interface PaidFetchInput {
  url: string;
  method?: string;
  body?: string;
  /** Decimal string, e.g. "0.05". Capped by the agent's own max price. */
  maxPrice: string;
}

export interface PaidFetchResult {
  status: number;
  body: unknown;
  paid: string | null;
  remaining_budget: string | null;
}

async function request(input: PaidFetchInput, agent: Agent, authorization?: string): Promise<Response> {
  const headers: Record<string, string> = { [AGENT_ID_HEADER]: agent.id, accept: "application/json, text/plain, */*" };
  if (authorization) headers.authorization = authorization;
  if (input.body !== undefined) {
    headers["content-type"] = (() => {
      try {
        JSON.parse(input.body);
        return "application/json";
      } catch {
        return "text/plain";
      }
    })();
  }
  return fetch(input.url, { method: input.method ?? "GET", headers, body: input.body });
}

async function readBody(res: Response): Promise<unknown> {
  const text = (await res.text()).slice(0, MAX_BODY_CHARS);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function paidFetch(agent: Agent, input: PaidFetchInput): Promise<PaidFetchResult> {
  const requestId = randomUUID();
  const toolMax = toMinor(input.maxPrice, agent.assetScale);
  const maxPriceMinor = toolMax < BigInt(agent.maxPriceMinor) ? toolMax : BigInt(agent.maxPriceMinor);

  record({ agentId: agent.id, requestId, step: "request", detail: { method: input.method ?? "GET", url: input.url } });
  const first = await request(input, agent);
  if (first.status !== 402) {
    record({ agentId: agent.id, requestId, step: "response", detail: { status: first.status } });
    return { status: first.status, body: await readBody(first), paid: null, remaining_budget: null };
  }

  const charge = parsePaymentRequiredHeader(first.headers.get(PAYMENT_REQUIRED_HEADER));
  if (!charge) {
    record({ agentId: agent.id, requestId, step: "payment_rejected", detail: { error: ErrorCode.INVALID_PAYMENT_REQUIRED } });
    throw new WalletError(ErrorCode.INVALID_PAYMENT_REQUIRED);
  }
  record({
    agentId: agent.id,
    requestId,
    step: "payment_required",
    detail: { price: formatAmount({ value: BigInt(charge.amount), assetCode: charge.assetCode, assetScale: charge.assetScale }) },
  });

  let result: PayResult;
  try {
    result = await pay(agent, charge, { maxPriceMinor, targetUrl: input.url, requestId });
  } catch (err) {
    const code = err instanceof WalletError ? err.code : ErrorCode.OPEN_PAYMENTS_ERROR;
    record({ agentId: agent.id, requestId, step: "payment_rejected", detail: { error: code } });
    throw err;
  }
  const { payment, alreadyPaid } = result;

  const second = await request(input, agent, buildPaymentAuthorization(charge.incoming));
  record({ agentId: agent.id, requestId, step: "response", detail: { status: second.status } });
  const balance = await getBalance(agent).catch(() => null);
  return {
    status: second.status,
    body: await readBody(second),
    paid: alreadyPaid ? null : money(agent, payment.debitMinor ?? payment.priceMinor),
    remaining_budget: balance?.remaining ?? null,
  };
}
