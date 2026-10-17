import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AGENT_ID_HEADER,
  PAYMENT_RECEIPT_HEADER,
  PAYMENT_REQUIRED_HEADER,
  formatPaymentRequiredHeader,
  parsePaymentAuthorization,
} from "@flupay/shared";
import { chargePrice, createCharge, paymentRequired, verifyAndConsume } from "@/lib/charges";
import { db } from "@/lib/db";
import { ApiError, ApiErrorCode } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Agent-facing checkout, hosted by FluPay for every merchant. It is built on the same
 * charges logic a merchant's own backend would call through /api/v1/charges:
 *   no proof        -> create charge, answer 402 + Payment-Required
 *   proof (paid)    -> consume charge, answer 200 with the order
 */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/stores/[slug]/checkout">) => {
  const { slug } = await ctx.params;
  const merchant = await db.merchant.findUnique({ where: { slug } });
  if (!merchant) throw new ApiError(ApiErrorCode.NOT_FOUND, "Store not found", 404);

  const { product_id, quantity } = z
    .object({ product_id: z.string().min(1), quantity: z.literal(1).default(1) })
    .parse(await readJson(request));
  const product = await db.product.findFirst({ where: { id: product_id, merchantId: merchant.id, active: true } });
  if (!product) throw new ApiError(ApiErrorCode.NOT_FOUND, "Product not found", 404);

  const proof = parsePaymentAuthorization(request.headers.get("authorization"));
  if (proof) {
    const result = await verifyAndConsume(merchant, proof, { productId: product.id });
    if (result.valid) {
      return NextResponse.json(
        {
          status: "confirmed",
          order: {
            id: `ord_${result.charge.id}`,
            store: merchant.name,
            product: { id: product.id, name: product.name },
            quantity,
            paid: chargePrice(result.charge),
          },
        },
        { headers: { [PAYMENT_RECEIPT_HEADER]: result.charge.incomingUrl } },
      );
    }
    // Invalid, used or unpaid proof: fall through to a fresh 402.
  }

  const charge = await createCharge(merchant, {
    productId: product.id,
    agentHint: request.headers.get(AGENT_ID_HEADER) ?? undefined,
  });
  return NextResponse.json(
    { error: "payment_required", price: chargePrice(charge), incoming: charge.incomingUrl, product: product.name },
    { status: 402, headers: { [PAYMENT_REQUIRED_HEADER]: formatPaymentRequiredHeader(paymentRequired(merchant, charge)) } },
  );
});
