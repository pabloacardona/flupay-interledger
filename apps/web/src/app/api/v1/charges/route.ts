import { NextResponse } from "next/server";
import { z } from "zod";
import { createCharge, serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { handle, readJson } from "@/lib/http";
import { authenticate } from "@/lib/merchants";

export const dynamic = "force-dynamic";

const decimal = z.string().regex(/^\d+(\.\d+)?$/);

/** Creates a charge. Respond 402 to the agent with `payment_required` as the Payment-Required header. */
export const POST = handle(async (request: Request) => {
  const merchant = await authenticate(request);
  const body = z
    .object({
      product_id: z.string().optional(),
      amount: decimal.optional(),
      description: z.string().max(200).optional(),
      reference: z.string().max(100).optional(),
      agent_hint: z.string().max(100).optional(),
    })
    .parse(await readJson(request));
  const charge = await createCharge(merchant, {
    productId: body.product_id,
    amount: body.amount,
    description: body.description,
    reference: body.reference,
    agentHint: body.agent_hint,
  });
  return NextResponse.json(serializeCharge(merchant, charge), { status: 201 });
});

export const GET = handle(async (request: Request) => {
  const merchant = await authenticate(request);
  const charges = await db.charge.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(charges.map((c) => serializeCharge(merchant, c)));
});
