import { NextResponse } from "next/server";
import { flupay, storeUrl } from "@/lib/flupay";

export const dynamic = "force-dynamic";

/** Free catalog for agents. */
export async function GET() {
  try {
    const products = await flupay.products();
    return NextResponse.json({
      store: "Café Andino",
      checkout: { method: "POST", url: `${storeUrl()}/api/checkout`, body: { product_id: "<id>" }, payment: "HTTP 402 + Open Payments" },
      products: products.map(({ id, name, description, price }) => ({ id, name, description, price })),
    });
  } catch (err) {
    return NextResponse.json({ error: "catalog_unavailable", message: (err as Error).message }, { status: 503 });
  }
}
