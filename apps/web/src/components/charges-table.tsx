import type { Charge, Merchant, Product } from "@/generated/prisma/client";
import { moneyOf } from "@/lib/format";
import { StatusBadge } from "./ui";

export function ChargesTable({ merchant, charges }: { merchant: Merchant; charges: (Charge & { product: Product | null })[] }) {
  const money = moneyOf(merchant);
  if (charges.length === 0) {
    return <p className="text-sm text-muted">Aún no hay cobros. Cuando un agente llegue a tu checkout, aparece aquí en tiempo real.</p>;
  }
  return (
    <div className="-mx-5 -mb-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-bg font-mono text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-5 py-2.5 font-medium">Hora</th>
            <th className="px-5 py-2.5 font-medium">Producto</th>
            <th className="px-5 py-2.5 font-medium">Agente</th>
            <th className="px-5 py-2.5 font-medium">Monto</th>
            <th className="px-5 py-2.5 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {charges.map((c) => (
            <tr key={c.id} className="hover:bg-bg/60">
              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">
                {c.createdAt.toISOString().slice(5, 10)} {c.createdAt.toISOString().slice(11, 19)}
              </td>
              <td className="px-5 py-3">{c.product?.name ?? c.description ?? "—"}</td>
              <td className="px-5 py-3 font-mono text-xs text-muted">{c.agentHint ? `${c.agentHint.slice(0, 12)}…` : "—"}</td>
              <td className="whitespace-nowrap px-5 py-3 font-mono">{money(c.amountMinor)}</td>
              <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
