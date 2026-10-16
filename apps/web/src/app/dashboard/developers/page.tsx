import { regenerateApiKey } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { NewKeyBanner } from "@/components/new-key-banner";
import { Card, PageHeader } from "@/components/ui";
import { env } from "@/lib/env";
import { readNewApiKey, requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

const endpoints = [
  ["POST", "/api/v1/charges", "Crea un cobro con product_id o amount. Devuelve payment_required e incoming_url."],
  ["GET", "/api/v1/charges/:id", "Estado en vivo: pending, paid, consumed, expired."],
  ["POST", "/api/v1/charges/verify", "Verifica la prueba de pago del agente y la consume (un solo uso). Devuelve { valid, reason, charge }."],
  ["GET", "/api/v1/products", "Lista tus productos."],
  ["POST", "/api/v1/products", "Crea un producto { name, description?, price }."],
];

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-4 font-mono text-xs leading-relaxed">{children}</pre>
      <div className="absolute right-2 top-2"><CopyButton value={children} /></div>
    </div>
  );
}

export default async function Developers() {
  const merchant = await requireMerchant();
  const newKey = await readNewApiKey();
  const base = env.PUBLIC_URL;
  const store = `${base}/api/stores/${merchant.slug}`;

  const node = `// Tu endpoint de checkout (Express). Los agentes reciben 402 hasta que pagan.
app.post("/checkout", async (req, res) => {
  const headers = { authorization: \`Bearer \${process.env.FLUPAY_KEY}\`, "content-type": "application/json" };
  const proof = req.get("authorization"); // "OpenPayments <incoming url>"

  if (proof) {
    const check = await fetch("${base}/api/v1/charges/verify", {
      method: "POST", headers,
      body: JSON.stringify({ authorization: proof, product_id: req.body.product_id }),
    }).then((r) => r.json());
    if (check.valid) return res.json(await createOrder(req.body)); // pagado, un solo uso
  }

  const charge = await fetch("${base}/api/v1/charges", {
    method: "POST", headers,
    body: JSON.stringify({ product_id: req.body.product_id, agent_hint: req.get("x-agent-id") }),
  }).then((r) => r.json());

  res.status(402).set("Payment-Required", charge.payment_required)
    .json({ error: "payment_required", price: charge.price, incoming: charge.incoming_url });
});`;

  const curl = `curl -X POST ${base}/api/v1/charges \\
  -H "Authorization: Bearer sk_..." -H "content-type: application/json" \\
  -d '{"product_id":"<product id>"}'`;

  return (
    <>
      <PageHeader title="Desarrolladores" description="API key, endpoints para agentes y la API de cobros." />
      {newKey && <NewKeyBanner apiKey={newKey} />}

      <Card title="API key secreta" action={<form action={regenerateApiKey}><button className="text-xs font-medium text-muted hover:text-ink">Regenerar</button></form>}>
        <div className="flex items-center gap-3">
          <code className="rounded-lg bg-bg px-3 py-2 font-mono text-sm">sk_••••••••••••••••{merchant.apiKeyLast4}</code>
          <p className="text-sm text-muted">Envíala como <code className="font-mono">Authorization: Bearer sk_…</code>. Al regenerarla, la anterior deja de funcionar.</p>
        </div>
      </Card>

      <Card title="Tienda para agentes (sin código)">
        <div className="space-y-2">
          {[
            ["GET", `${store}/products`, "Catálogo gratis"],
            ["POST", `${store}/checkout`, "402 hasta que se pague · body { product_id }"],
          ].map(([m, url, note]) => (
            <div key={url} className="flex flex-wrap items-center gap-2">
              <span className="w-12 rounded-md bg-brand-soft px-2 py-1 text-center font-mono text-xs font-semibold text-brand">{m}</span>
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-bg px-3 py-2 font-mono text-xs">{url}</code>
              <span className="hidden text-xs text-muted lg:inline">{note}</span>
              <CopyButton value={url!} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="API de cobros">
        <div className="-mx-5 -mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-line">
              {endpoints.map(([m, p, d]) => (
                <tr key={`${m} ${p}`}>
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold text-brand">{m}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs">{p}</td>
                  <td className="px-5 py-2.5 text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">En tu checkout (Node / Express)</p>
            <Code>{node}</Code>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">curl</p>
            <Code>{curl}</Code>
          </div>
        </div>
      </Card>

      <Card title="Para agentes">
        <p className="mb-3 text-sm text-muted">
          Los agentes pagan con la wallet MCP de FluPay: <code className="font-mono">paid_fetch</code> maneja el 402, paga dentro del tope del dueño y reintenta con la prueba de pago.
        </p>
        <Code>{`claude mcp add --transport http flupay https://mcp.useflupay.space/mcp --header "x-agent-key: fpk_..."`}</Code>
      </Card>
    </>
  );
}
