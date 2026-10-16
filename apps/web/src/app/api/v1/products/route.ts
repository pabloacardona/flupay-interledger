import { NextResponse } from "next/server";
import { z } from "zod";
import { formatAmount } from "@flupay/shared";
import { db } from "@/lib/db";
import { handle, readJson } from "@/lib/http";
import { authenticate, createProduct } from "@/lib/merchants";

export const dynamic = "force-dynamic";

export const GET = handle(async (request: Request) => {
  const merchant = await authenticate(request);
  const products = await db.product.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: formatAmount({ value: BigInt(p.priceMinor), assetCode: merchant.assetCode, assetScale: merchant.assetScale }),
      active: p.active,
    })),
  );
});

export const POST = handle(async (request: Request) => {
  const merchant = await authenticate(request);
  const body = z
    .object({ name: z.string().min(1).max(100), description: z.string().max(500).optional(), price: z.string().regex(/^\d+(\.\d+)?$/) })
    .parse(await readJson(request));
  const product = await createProduct(merchant, body);
  return NextResponse.json({ id: product.id, name: product.name }, { status: 201 });
});
