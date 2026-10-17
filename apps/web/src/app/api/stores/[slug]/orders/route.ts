import { NextResponse } from "next/server";
import { chargePrice } from "@/lib/charges";
import { db } from "@/lib/db";
import { ApiError, ApiErrorCode } from "@/lib/errors";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Public order feed of a store's hosted checkout: product, price, status and time only
 * (no payment URLs, no agent ids). Lets a storefront show agent purchases with no API key.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/stores/[slug]/orders">) => {
  const { slug } = await ctx.params;
  const merchant = await db.merchant.findUnique({ where: { slug } });
  if (!merchant) throw new ApiError(ApiErrorCode.NOT_FOUND, "Store not found", 404);
  const charges = await db.charge.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json({
    store: merchant.name,
    orders: charges.map((c) => ({
      id: `ORD-${c.id.slice(-6).toUpperCase()}`,
      product: c.product?.name ?? c.description,
      price: chargePrice(c),
      status: c.status,
      created_at: c.createdAt.toISOString(),
      paid_at: c.paidAt?.toISOString() ?? null,
    })),
  });
});
