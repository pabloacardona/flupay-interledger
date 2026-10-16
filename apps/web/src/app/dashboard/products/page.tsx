import { toggleProduct } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { ProductForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { moneyOf } from "@/lib/format";
import { requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Products() {
  const merchant = await requireMerchant();
  const money = moneyOf(merchant);
  const products = await db.product.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { charges: { where: { status: { in: ["paid", "consumed"] } } } } } },
  });

  return (
    <>
      <PageHeader title="Productos" description={`Lo que los agentes pueden comprar. Precios en ${merchant.assetCode}.`} />
      <Card title="Nuevo producto"><ProductForm currency={merchant.assetCode} /></Card>
      <Card title={`Catálogo (${products.length})`}>
        {products.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay productos.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg font-mono text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Producto</th>
                  <th className="px-5 py-2.5 font-medium">ID del producto</th>
                  <th className="px-5 py-2.5 font-medium">Precio</th>
                  <th className="px-5 py-2.5 font-medium">Vendidos</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <p className={p.active ? "font-medium" : "text-muted line-through"}>{p.name}</p>
                      {p.description && <p className="text-xs text-muted">{p.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-muted">{p.id}</code>
                        <CopyButton value={p.id} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono">{money(p.priceMinor)}</td>
                    <td className="px-5 py-3 font-mono">{p._count.charges}</td>
                    <td className="px-5 py-3 text-right">
                      <form action={toggleProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-xs font-medium text-muted hover:text-ink">{p.active ? "Ocultar" : "Mostrar"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
