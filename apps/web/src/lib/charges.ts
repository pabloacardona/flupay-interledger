import "server-only";
import { formatAmount, formatPaymentRequiredHeader, toMinor, type PaymentRequired } from "@flupay/shared";
import type { Charge, Merchant } from "@/generated/prisma/client";
import { db } from "./db";
import { env } from "./env";
import { ApiError, ApiErrorCode } from "./errors";
import { describeOpError, op, withIncomingToken } from "./op";

export interface CreateChargeInput {
  productId?: string;
  /** Decimal string in the merchant's currency; required when there is no product. */
  amount?: string;
  description?: string;
  reference?: string;
  agentHint?: string;
}

/** Creates an Open Payments incoming payment on the merchant's wallet: one charge, single use. */
export async function createCharge(merchant: Merchant, input: CreateChargeInput): Promise<Charge> {
  let amountMinor: number;
  let description = input.description;
  if (input.productId) {
    const product = await db.product.findFirst({ where: { id: input.productId, merchantId: merchant.id, active: true } });
    if (!product) throw new ApiError(ApiErrorCode.NOT_FOUND, "Product not found", 404);
    amountMinor = product.priceMinor;
    description ??= product.name;
  } else if (input.amount) {
    amountMinor = Number(toMinor(input.amount, merchant.assetScale));
  } else {
    throw new ApiError(ApiErrorCode.VALIDATION_ERROR, "Provide product_id or amount");
  }
  if (amountMinor <= 0) throw new ApiError(ApiErrorCode.VALIDATION_ERROR, "Amount must be positive");

  const expiresAt = new Date(Date.now() + env.CHARGE_TTL_SECONDS * 1000);
  const client = await op();
  let incoming;
  try {
    incoming = await withIncomingToken(merchant.authServer, (accessToken) =>
      client.incomingPayment.create(
        { url: merchant.resourceServer, accessToken },
        {
          walletAddress: merchant.walletAddress,
          incomingAmount: { value: String(amountMinor), assetCode: merchant.assetCode, assetScale: merchant.assetScale },
          expiresAt: expiresAt.toISOString(),
          metadata: { description, reference: input.reference, source: "flupay" },
        },
      ),
    );
  } catch (err) {
    throw new ApiError(ApiErrorCode.OPEN_PAYMENTS_ERROR, `Could not create incoming payment: ${describeOpError(err)}`, 502);
  }

  return db.charge.create({
    data: {
      merchantId: merchant.id,
      productId: input.productId ?? null,
      description: description ?? null,
      reference: input.reference ?? null,
      incomingUrl: incoming.id,
      amountMinor,
      assetCode: merchant.assetCode,
      assetScale: merchant.assetScale,
      status: "pending",
      agentHint: input.agentHint ?? null,
      expiresAt,
    },
  });
}

/** Re-reads the incoming payment and updates the charge to paid / expired. */
export async function refreshCharge(merchant: Merchant, charge: Charge): Promise<Charge> {
  if (charge.status !== "pending") return charge;
  const client = await op();
  try {
    const incoming = await withIncomingToken(merchant.authServer, (accessToken) =>
      client.incomingPayment.get({ url: charge.incomingUrl, accessToken }),
    );
    if (BigInt(incoming.receivedAmount.value) >= BigInt(charge.amountMinor) || incoming.completed) {
      return db.charge.update({ where: { id: charge.id }, data: { status: "paid", paidAt: new Date() } });
    }
  } catch (err) {
    throw new ApiError(ApiErrorCode.OPEN_PAYMENTS_ERROR, `Could not read incoming payment: ${describeOpError(err)}`, 502);
  }
  if (charge.expiresAt.getTime() < Date.now()) {
    return db.charge.update({ where: { id: charge.id }, data: { status: "expired" } });
  }
  return charge;
}

export type VerifyResult =
  | { valid: true; charge: Charge }
  | { valid: false; reason: "unknown_charge" | "already_used" | "expired" | "not_paid" | "wrong_product"; charge?: Charge };

/**
 * Verifies the proof of payment sent by an agent (`Authorization: OpenPayments <incoming url>`)
 * and consumes it: each charge unlocks exactly one purchase.
 */
export async function verifyAndConsume(merchant: Merchant, incomingUrl: string, expect?: { productId?: string }): Promise<VerifyResult> {
  const found = await db.charge.findFirst({ where: { incomingUrl, merchantId: merchant.id } });
  if (!found) return { valid: false, reason: "unknown_charge" };
  if (found.status === "consumed") return { valid: false, reason: "already_used", charge: found };
  if (expect?.productId && found.productId !== expect.productId) return { valid: false, reason: "wrong_product", charge: found };

  const charge = await refreshCharge(merchant, found);
  if (charge.status === "expired") return { valid: false, reason: "expired", charge };
  if (charge.status !== "paid") return { valid: false, reason: "not_paid", charge };

  // Atomic single use: only one request can flip paid -> consumed.
  const { count } = await db.charge.updateMany({
    where: { id: charge.id, status: "paid" },
    data: { status: "consumed", consumedAt: new Date() },
  });
  if (count !== 1) return { valid: false, reason: "already_used", charge };
  return { valid: true, charge: { ...charge, status: "consumed", consumedAt: new Date() } };
}

/** The 402 contract shared with the agent wallet (`Payment-Required` header). */
export function paymentRequired(merchant: Merchant, charge: Charge): PaymentRequired {
  return {
    wallet: merchant.walletAddress,
    incoming: charge.incomingUrl,
    amount: String(charge.amountMinor),
    assetCode: charge.assetCode,
    assetScale: charge.assetScale,
    expiresAt: charge.expiresAt.toISOString(),
  };
}

export function chargePrice(charge: Pick<Charge, "amountMinor" | "assetCode" | "assetScale">): string {
  return formatAmount({ value: BigInt(charge.amountMinor), assetCode: charge.assetCode, assetScale: charge.assetScale });
}

/** Public JSON representation of a charge (merchant API). */
export function serializeCharge(merchant: Merchant, charge: Charge) {
  return {
    id: charge.id,
    status: charge.status,
    amount: String(charge.amountMinor),
    asset_code: charge.assetCode,
    asset_scale: charge.assetScale,
    price: chargePrice(charge),
    description: charge.description,
    reference: charge.reference,
    product_id: charge.productId,
    incoming_url: charge.incomingUrl,
    expires_at: charge.expiresAt.toISOString(),
    paid_at: charge.paidAt?.toISOString() ?? null,
    consumed_at: charge.consumedAt?.toISOString() ?? null,
    payment_required: formatPaymentRequiredHeader(paymentRequired(merchant, charge)),
  };
}
