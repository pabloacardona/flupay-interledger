import { NextResponse } from "next/server";
import { z } from "zod";
import { forwardCheckout } from "@/lib/flupay";

export const dynamic = "force-dynamic";

/**
 * Agent checkout. FluPay answers 402 with Payment-Required until the agent pays,
 * then verifies the proof (Authorization: OpenPayments <url>) once and confirms the order.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let json: unknown = {};
  try {
    json = JSON.parse(raw || "{}");
  } catch {
    // validated below
  }
  const parsed = z.object({ product_id: z.string().min(1) }).safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  try {
    return await forwardCheckout(request, JSON.stringify({ product_id: parsed.data.product_id }));
  } catch (err) {
    return NextResponse.json({ error: "checkout_unavailable", message: (err as Error).message }, { status: 503 });
  }
}
