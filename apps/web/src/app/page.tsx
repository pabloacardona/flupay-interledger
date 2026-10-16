import Link from "next/link";

const steps = [
  { n: "1", title: "Connect your wallet", body: "Paste your Open Payments wallet address. Agents pay you there directly." },
  { n: "2", title: "List what agents can buy", body: "Products with a price in your currency. You get an agent-ready catalog and checkout." },
  { n: "3", title: "Agents pay on their own", body: "Checkout answers HTTP 402. The agent pays from its capped wallet and gets the order." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 pt-6">
        <p className="text-sm font-medium text-brand">HTTP 402 on Open Payments</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          AI agents are already shopping. Let them pay you.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Your store is getting traffic from agents that cannot check out. FluPay gives you a charges API and an
          agent-ready checkout: the agent pays from its own wallet, inside a cap its owner approved, straight to yours.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink hover:opacity-90">
            Create merchant account
          </Link>
          <Link href="/login" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold hover:bg-surface">
            Sign in with API key
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-xl border border-line bg-surface p-5">
            <span className="text-sm font-mono text-muted">{s.n}</span>
            <h2 className="mt-2 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-semibold">What the agent sees</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-bg p-4 font-mono text-xs leading-relaxed">{`POST /api/stores/cafe-andino/checkout  {"product_id":"..."}
← 402 Payment Required
  Payment-Required: {"incoming":"https://ilp.../incoming-payments/...","amount":"20000","assetCode":"COP","assetScale":2}

  agent pays with Open Payments (quote → outgoing payment)

POST /api/stores/cafe-andino/checkout
  Authorization: OpenPayments https://ilp.../incoming-payments/...
← 200 {"status":"confirmed","order":{...}}`}</pre>
      </section>
    </div>
  );
}
