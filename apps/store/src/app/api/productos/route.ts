import { NextResponse } from "next/server";
import { getProducts, storeUrl } from "@/lib/flupay";

export const dynamic = "force-dynamic";

/** Free catalog for agents. */
export async function GET() {
  try {
    const products = await getProducts();
    if (!products) return NextResponse.json({ error: "store_not_registered" }, { status: 503 });
    return NextResponse.json({
      store: "Café Andino",
      checkout: { method: "POST", url: `${storeUrl()}/api/checkout`, body: { product_id: "<id>" }, payment: "HTTP 402 + Open Payments" },
      products,
    });
  } catch (err) {
    return NextResponse.json({ error: "catalog_unavailable", message: (err as Error).message }, { status: 503 });
  }
}
