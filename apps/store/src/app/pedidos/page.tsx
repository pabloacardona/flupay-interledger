import { getOrders, type Order } from "@/lib/flupay";
import { LiveRefresh } from "./live";

export const dynamic = "force-dynamic";

const label: Record<Order["status"], [string, string]> = {
  pending: ["Esperando pago del agente", "bg-[#fff1d6] text-[#8a5a00]"],
  paid: ["Pagado", "bg-leaf/10 text-leaf"],
  consumed: ["Pagado · pedido confirmado", "bg-leaf/10 text-leaf"],
  expired: ["Cobro vencido", "bg-black/5 text-muted"],
};

export default async function Pedidos() {
  let charges: Order[] = [];
  let error: string | null = null;
  try {
    const orders = await getOrders();
    if (orders === null) error = "La tienda todavía no está registrada en FluPay.";
    else charges = orders;
  } catch (err) {
    error = (err as Error).message;
  }
  const confirmed = charges.filter((c) => c.status === "consumed" || c.status === "paid");

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">Pedidos de agentes</h1>
          <p className="mt-2 text-muted">Cada compra de un agente pasa por un cobro de Open Payments en nuestra wallet. Se actualiza en vivo.</p>
        </div>
        <div className="rounded-2xl bg-paper px-5 py-3 ring-1 ring-line">
          <p className="text-xs text-muted">Pedidos confirmados</p>
          <p className="font-mono text-2xl font-semibold">{confirmed.length}</p>
        </div>
      </div>
      {error ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-paper p-6 text-muted">{error}</p>
      ) : charges.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-paper p-6 text-muted">Todavía no hay pedidos. Pídele a tu agente que compre un café.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {charges.map((c) => {
            const [text, style] = label[c.status];
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
                <div>
                  <p className="font-medium">{c.product ?? "Pedido"}</p>
                  <p className="font-mono text-xs text-muted">{(c.paid_at ?? c.created_at).slice(0, 19).replace("T", " ")} UTC · {c.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold">{c.price}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>{text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
