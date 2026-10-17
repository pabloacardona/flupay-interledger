import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePaymentAuthorization } from "@flupay/shared";
import { serializeCharge, verifyAndConsume } from "@/lib/charges";
import { handle, readJson } from "@/lib/http";
import { authenticate } from "@/lib/merchants";

export const dynamic = "force-dynamic";

/**
 * Verifies an agent's proof of payment and consumes the charge (single use).
 * Accepts `incoming_url`, or the raw `authorization` header value (`OpenPayments <url>`).
 */
export const POST = handle(async (request: Request) => {
  const merchant = await authenticate(request);
  const body = z
    .object({ incoming_url: z.url().optional(), authorization: z.string().optional(), product_id: z.string().optional() })
    .parse(await readJson(request));
  const incomingUrl = body.incoming_url ?? parsePaymentAuthorization(body.authorization);
  if (!incomingUrl) return NextResponse.json({ valid: false, reason: "missing_proof" }, { status: 400 });
  const result = await verifyAndConsume(merchant, incomingUrl, { productId: body.product_id });
  return NextResponse.json({
    valid: result.valid,
    reason: result.valid ? null : result.reason,
    charge: result.charge ? serializeCharge(merchant, result.charge) : null,
  });
});
