const nodeExample = `// Your checkout endpoint (Express). Agents get a 402 until they pay.
app.post("/checkout", async (req, res) => {
  const proof = req.get("authorization"); // "OpenPayments <incoming url>"

  if (proof) {
    const check = await fetch("https://useflupay.space/api/v1/charges/verify", {
      method: "POST",
      headers: { authorization: \`Bearer \${process.env.FLUPAY_KEY}\`, "content-type": "application/json" },
      body: JSON.stringify({ authorization: proof, product_id: req.body.product_id }),
    }).then((r) => r.json());
    if (check.valid) return res.json(await createOrder(req.body)); // paid, single use
  }

  const charge = await fetch("https://useflupay.space/api/v1/charges", {
    method: "POST",
    headers: { authorization: \`Bearer \${process.env.FLUPAY_KEY}\`, "content-type": "application/json" },
    body: JSON.stringify({ product_id: req.body.product_id, agent_hint: req.get("x-agent-id") }),
  }).then((r) => r.json());

  res.status(402).set("Payment-Required", charge.payment_required)
    .json({ error: "payment_required", price: charge.price, incoming: charge.incoming_url });
});`;

const curlExample = `# Create a charge (one per purchase attempt)
curl -X POST https://useflupay.space/api/v1/charges \\
  -H "Authorization: Bearer sk_..." -H "content-type: application/json" \\
  -d '{"product_id":"<id>"}'

# Verify the agent's proof and consume it (valid only once)
curl -X POST https://useflupay.space/api/v1/charges/verify \\
  -H "Authorization: Bearer sk_..." -H "content-type: application/json" \\
  -d '{"incoming_url":"https://ilp.interledger-test.dev/.../incoming-payments/..."}'`;

const endpoints = [
  ["POST", "/api/v1/charges", "Create a charge from product_id or amount. Returns payment_required (header value) and incoming_url."],
  ["GET", "/api/v1/charges/:id", "Live status: pending, paid, consumed, expired."],
  ["POST", "/api/v1/charges/verify", "Verify proof of payment and consume it. Returns { valid, reason, charge }."],
  ["GET", "/api/v1/products", "Your products."],
  ["POST", "/api/v1/products", "Create a product { name, description?, price }."],
];

export default function Docs() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Integrate FluPay</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Two options. Use the hosted checkout from your dashboard with zero code, or call the charges API from your own
          backend. Either way the agent pays your wallet directly over Open Payments; FluPay creates and verifies the charge.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Charges API</h2>
        <p className="text-sm text-muted">Authenticate with <code className="font-mono">Authorization: Bearer sk_…</code>.</p>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-line">
              {endpoints.map(([m, p, d]) => (
                <tr key={`${m} ${p}`}>
                  <td className="px-4 py-2 font-mono text-xs">{m}</td>
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{p}</td>
                  <td className="px-4 py-2 text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">In your checkout (Node / Express)</h2>
        <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed">{nodeExample}</pre>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">With curl</h2>
        <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed">{curlExample}</pre>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">For agents</h2>
        <p className="text-sm text-muted">
          Agents connect to the FluPay MCP wallet at <code className="font-mono">https://mcp.useflupay.space/mcp</code> and call{" "}
          <code className="font-mono">paid_fetch</code>. It handles the 402, pays within the owner&apos;s cap, and retries with the proof.
        </p>
        <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-4 font-mono text-xs">{`claude mcp add --transport http flupay https://mcp.useflupay.space/mcp --header "x-agent-key: fpk_..."`}</pre>
      </section>
    </div>
  );
}
