import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChargesTable } from "@/components/charges-table";
import { CopyButton } from "@/components/copy-button";
import { NewKeyBanner } from "@/components/new-key-banner";
import { Card, LiveDot, PageHeader, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { moneyOf } from "@/lib/format";
import { readNewApiKey, requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const merchant = await requireMerchant();
  const money = moneyOf(merchant);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [newKey, paid, today, pending, activeProducts, recent] = await Promise.all([
    readNewApiKey(),
    db.charge.aggregate({ where: { merchantId: merchant.id, status: { in: ["paid", "consumed"] } }, _sum: { amountMinor: true }, _count: true }),
    db.charge.aggregate({ where: { merchantId: merchant.id, status: { in: ["paid", "consumed"] }, paidAt: { gte: since } }, _sum: { amountMinor: true } }),
    db.charge.count({ where: { merchantId: merchant.id, status: "pending", expiresAt: { gt: new Date() } } }),
    db.product.count({ where: { merchantId: merchant.id, active: true } }),
    db.charge.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 8, include: { product: true } }),
  ]);
  const checkoutUrl = `${env.PUBLIC_URL}/api/stores/${merchant.slug}/checkout`;

  return (
    <>
      <AutoRefresh />
      <PageHeader title="Overview" description="Revenue from AI agents buying your products." />
      {newKey && <NewKeyBanner apiKey={newKey} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={money(paid._sum.amountMinor ?? 0)} hint="All time, from agents" accent />
        <Stat label="Last 24 h" value={money(today._sum.amountMinor ?? 0)} />
        <Stat label="Paid orders" value={String(paid._count)} />
        <Stat label="Awaiting payment" value={String(pending)} hint={`${activeProducts} active products`} />
      </div>

      {activeProducts === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/60 bg-surface p-5">
          <div>
            <p className="font-semibold">Add your first product</p>
            <p className="text-sm text-muted">Agents can only buy what is in your catalog.</p>
          </div>
          <Link href="/dashboard/products" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">Add product</Link>
        </div>
      )}

      <Card title="Recent charges" action={<LiveDot />}>
        <ChargesTable merchant={merchant} charges={recent} />
      </Card>

      <Card title="Agent checkout">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-soft px-2 py-1 font-mono text-xs font-semibold text-brand">POST</span>
          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-bg px-3 py-2 font-mono text-xs">{checkoutUrl}</code>
          <CopyButton value={checkoutUrl} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Give this to agents, or integrate the charges API in your own checkout from{" "}
          <Link href="/dashboard/developers" className="font-medium text-brand">Developers</Link>.
        </p>
      </Card>
    </>
  );
}
