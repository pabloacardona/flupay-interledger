import { AutoRefresh } from "@/components/auto-refresh";
import { ChargesTable } from "@/components/charges-table";
import { Card, LiveDot, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Charges() {
  const merchant = await requireMerchant();
  const charges = await db.charge.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: true },
  });
  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="Charges"
        description="Every 402 creates a single-use Open Payments charge on your wallet. Paid charges unlock one order."
      />
      <Card title="All charges" action={<LiveDot />}>
        <ChargesTable merchant={merchant} charges={charges} />
      </Card>
    </>
  );
}
