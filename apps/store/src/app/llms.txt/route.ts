import { storeUrl } from "@/lib/flupay";

export const dynamic = "force-dynamic";

/** Instructions for AI agents (llms.txt convention). */
export function GET() {
  const base = storeUrl();
  const text = `# Café Andino

> Café de especialidad de Antioquia, Colombia. Los agentes de IA pueden comprar con Open Payments (HTTP 402). Precios en COP.

## Cómo comprar (agentes)

1. Catálogo gratis: GET ${base}/api/productos
2. Checkout: POST ${base}/api/checkout con {"product_id": "<id>"}
   - Responde 402 Payment Required con el header Payment-Required (cobro de Open Payments).
   - Paga ese cobro y repite el POST con Authorization: OpenPayments <incoming url>.
   - Respuesta 200 con la orden confirmada.

Con la wallet MCP de FluPay basta una llamada: paid_fetch(url="${base}/api/checkout", method="POST", body="{\\"product_id\\":\\"<id>\\"}", max_price="<precio>").
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
