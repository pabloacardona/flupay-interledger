import type { Balance } from "@/lib/agent-wallet";

/** Spent vs cap. Ratio is display-only; amounts come formatted from the agent wallet. */
export function BudgetBar({ balance }: { balance: Balance }) {
  if (balance.status !== "active") {
    return <p className="text-sm text-muted">Sin tope aprobado: el agente todavía no puede pagar.</p>;
  }
  const num = (v: string | null) => Number.parseFloat(v ?? "0") || 0;
  const pct = Math.min(100, (num(balance.spent) / Math.max(num(balance.budget), 1e-9)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <span className="font-mono font-semibold">{balance.spent}</span>
          <span className="text-muted"> gastado de {balance.budget}</span>
        </span>
        <span className="font-mono text-brand">{balance.remaining} disponible</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ededea]">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-bad" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
