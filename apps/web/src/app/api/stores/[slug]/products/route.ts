import { NextResponse } from "next/server";
import { formatAmount } from "@flupay/shared";
import { db } from "@/lib/db";
import { ApiError, ApiErrorCode } from "@/lib/errors";
import { handle } from "@/lib/http";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public, free catalog that agents can read before buying. */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/stores/[slug]/products">) => {
  const { slug } = await ctx.params;
  const merchant = await db.merchant.findUnique({ where: { slug }, include: { products: { where: { active: true } } } });
  if (!merchant) throw new ApiError(ApiErrorCode.NOT_FOUND, "Store not found", 404);
  return NextResponse.json({
    store: merchant.name,
    currency: merchant.assetCode,
    checkout: {
      method: "POST",
      url: `${env.PUBLIC_URL}/api/stores/${merchant.slug}/checkout`,
      body: { product_id: "<id>" },
      payment: "HTTP 402 with Open Payments (Payment-Required header)",
    },
    products: merchant.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: formatAmount({ value: BigInt(p.priceMinor), assetCode: merchant.assetCode, assetScale: merchant.assetScale }),
    })),
  });
});
