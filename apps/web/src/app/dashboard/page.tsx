import Link from "next/link";
import { formatAmount } from "@flupay/shared";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyButton } from "@/components/copy-button";
import { ProductForm } from "@/components/forms";
import { dismissNewKey, logOut, regenerateApiKey, toggleProduct } from "@/app/actions";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { readNewApiKey, requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

const statusStyle: Record<string, string> = {
  pending: "text-warn",
  paid: "text-ok",
  consumed: "text-ok",
  expired: "text-muted",
};
const statusLabel: Record<string, string> = { pending: "awaiting payment", paid: "paid", consumed: "paid · order delivered", expired: "expired" };

export default async function Dashboard() {
  const merchant = await requireMerchant();
  const [newKey, products, charges] = await Promise.all([
    readNewApiKey(),
    db.product.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" } }),
    db.charge.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 25, include: { product: true } }),
  ]);
  const money = (minor: number) => formatAmount({ value: BigInt(minor), assetCode: merchant.assetCode, assetScale: merchant.assetScale });
  const paidCharges = await db.charge.aggregate({
    where: { merchantId: merchant.id, status: { in: ["paid", "consumed"] } },
    _sum: { amountMinor: true },
    _count: true,
  });
  const storeBase = `${env.PUBLIC_URL}/api/stores/${merchant.slug}`;

  return (
    <div className="space-y-8">
      <AutoRefresh />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{merchant.name}</h1>
          <p className="mt-1 break-all font-mono text-xs text-muted">{merchant.walletAddress} · {merchant.assetCode}</p>
        </div>
        <form action={logOut}><button className="text-sm text-muted underline">Sign out</button></form>
      </div>

      {newKey && (
        <div className="rounded-xl border border-brand bg-surface p-5">
          <p className="font-semibold">Your secret API key</p>
          <p className="mt-1 text-sm text-muted">Copy it now. It is shown only once and is also your login.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-bg px-3 py-2 font-mono text-sm">{newKey}</code>
            <CopyButton value={newKey} />
          </div>
          <form action={dismissNewKey} className="mt-3"><button className="text-sm underline">I saved it</button></form>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Revenue from agents" value={money(paidCharges._sum.amountMinor ?? 0)} />
        <Stat label="Paid orders" value={String(paidCharges._count)} />
        <Stat label="Products" value={String(products.filter((p) => p.active).length)} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 space-y-3">
        <h2 className="font-semibold">Agent-ready endpoints</h2>
        <Endpoint label="Catalog (free)" value={`GET ${storeBase}/products`} copy={`${storeBase}/products`} />
        <Endpoint label="Checkout (HTTP 402)" value={`POST ${storeBase}/checkout`} copy={`${storeBase}/checkout`} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <span>API key <code className="font-mono">sk_…{merchant.apiKeyLast4}</code></span>
          <div className="flex gap-3">
            <Link href="/docs" className="underline">Integrate in your backend</Link>
            <form action={regenerateApiKey}><button className="text-muted underline">Regenerate key</button></form>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <h2 className="font-semibold">Products</h2>
        <ProductForm currency={merchant.assetCode} />
        {products.length > 0 && (
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className={`font-medium ${p.active ? "" : "text-muted line-through"}`}>{p.name}</p>
                  <p className="font-mono text-xs text-muted">{p.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm">{money(p.priceMinor)}</span>
                  <form action={toggleProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-muted underline">{p.active ? "Hide" : "Show"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Charges</h2>
          <span className="text-xs text-muted">live · refreshes every 3 s</span>
        </div>
        {charges.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No charges yet. When an agent hits your checkout, it shows up here.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="py-2 pr-4 font-medium">Time</th><th className="py-2 pr-4 font-medium">Item</th><th className="py-2 pr-4 font-medium">Agent</th><th className="py-2 pr-4 font-medium">Amount</th><th className="py-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 font-mono text-xs text-muted">{c.createdAt.toISOString().slice(11, 19)}</td>
                    <td className="py-2 pr-4">{c.product?.name ?? c.description ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted">{c.agentHint ? `${c.agentHint.slice(0, 10)}…` : "—"}</td>
                    <td className="py-2 pr-4 font-mono">{money(c.amountMinor)}</td>
                    <td className={`py-2 ${statusStyle[c.status] ?? ""}`}>{statusLabel[c.status] ?? c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Endpoint({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-40 shrink-0 text-sm text-muted">{label}</span>
      <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-bg px-3 py-1.5 font-mono text-xs">{value}</code>
      <CopyButton value={copy} />
    </div>
  );
}
