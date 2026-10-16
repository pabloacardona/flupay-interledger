import { NextResponse } from "next/server";
import { refreshCharge, serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { ApiError, ApiErrorCode } from "@/lib/errors";
import { handle } from "@/lib/http";
import { authenticate } from "@/lib/merchants";

export const dynamic = "force-dynamic";

/** Returns the charge with its live status (pending, paid, consumed, expired). */
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/v1/charges/[id]">) => {
  const merchant = await authenticate(request);
  const { id } = await ctx.params;
  const charge = await db.charge.findFirst({ where: { id, merchantId: merchant.id } });
  if (!charge) throw new ApiError(ApiErrorCode.NOT_FOUND, "Charge not found", 404);
  return NextResponse.json(serializeCharge(merchant, await refreshCharge(merchant, charge)));
});
