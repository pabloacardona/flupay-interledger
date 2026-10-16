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
        title="Cobros"
        description="Cada 402 crea un cobro de Open Payments de un solo uso en tu wallet. Cada cobro pagado libera una orden."
      />
      <Card title="Todos los cobros" action={<LiveDot />}>
        <ChargesTable merchant={merchant} charges={charges} />
      </Card>
    </>
  );
}
