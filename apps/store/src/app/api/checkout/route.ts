import { NextResponse } from "next/server";
import { z } from "zod";
import { PAYMENT_RECEIPT_HEADER, PAYMENT_REQUIRED_HEADER } from "@flupay/shared";
import { flupay } from "@/lib/flupay";

export const dynamic = "force-dynamic";

/**
 * Agent checkout. Same pattern any merchant backend follows with FluPay:
 *   no proof of payment -> create a charge, answer 402 with Payment-Required
 *   proof (Authorization: OpenPayments <url>) -> verify once with FluPay, confirm the order
 */
export async function POST(request: Request) {
  const parsed = z.object({ product_id: z.string().min(1) }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  const productId = parsed.data.product_id;

  try {
    const product = (await flupay.products()).find((p) => p.id === productId);
    if (!product) return NextResponse.json({ error: "product_not_found" }, { status: 404 });

    const proof = request.headers.get("authorization");
    if (proof?.startsWith("OpenPayments ")) {
      const check = await flupay.verify(proof, productId);
      if (check.valid && check.charge) {
        return NextResponse.json(
          {
            status: "confirmed",
            order: {
              id: `CA-${check.charge.id.slice(-6).toUpperCase()}`,
              product: product.name,
              paid: check.charge.price,
              delivery: "Envío a domicilio en Medellín en 24 h",
            },
            message: "¡Gracias por tu compra en Café Andino!",
          },
          { headers: { [PAYMENT_RECEIPT_HEADER]: check.charge.incoming_url } },
        );
      }
    }

    const charge = await flupay.createCharge(productId, request.headers.get("x-agent-id") ?? undefined);
    return NextResponse.json(
      { error: "payment_required", product: product.name, price: charge.price, incoming: charge.incoming_url },
      { status: 402, headers: { [PAYMENT_REQUIRED_HEADER]: charge.payment_required } },
    );
  } catch (err) {
    return NextResponse.json({ error: "checkout_unavailable", message: (err as Error).message }, { status: 503 });
  }
}
