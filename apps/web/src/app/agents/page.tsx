import Link from "next/link";
import { BudgetBar } from "@/components/budget-bar";
import { CreateAgentForm } from "@/components/owner-forms";
import { SecretBanner } from "@/components/secret-banner";
import { Card, PageHeader } from "@/components/ui";
import { agentWallet } from "@/lib/agent-wallet";
import { readSecret, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Agents() {
  const owner = await requireOwner();
  const [ownerKey, agents] = await Promise.all([readSecret("ownerKey"), agentWallet.listAgents(owner.walletOwnerId)]);

  return (
    <>
      <PageHeader title="Mis agentes" description="Registra tus agentes, aprueba cuánto pueden gastar y conéctalos por MCP." />
      {ownerKey && (
        <SecretBanner
          title="Tu clave de acceso"
          note="Cópiala ahora. Solo se muestra una vez y es con la que inicias sesión."
          value={ownerKey}
        />
      )}

      <Card title="Registrar un agente"><CreateAgentForm /></Card>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          Aún no tienes agentes. Registra el primero con la wallet desde la que va a pagar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="group rounded-xl border border-line bg-surface p-5 transition hover:border-brand">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold group-hover:text-brand">{a.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{a.wallet_address}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.balance.status === "active" ? "bg-[#e8f6ee] text-ok" : "bg-[#fff6e5] text-warn"}`}>
                  {a.balance.status === "active" ? "Puede pagar" : "Sin tope"}
                </span>
              </div>
              <div className="mt-4"><BudgetBar balance={a.balance} /></div>
              <p className="mt-3 text-xs text-muted">Máximo por compra: <span className="font-mono">{a.max_price}</span></p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
