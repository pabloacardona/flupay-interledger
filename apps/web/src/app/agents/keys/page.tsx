import Link from "next/link";
import { rotateMcpKeyAction, rotateOwnerKeyAction } from "@/app/agents/actions";
import { SecretBanner } from "@/components/secret-banner";
import { Card, PageHeader } from "@/components/ui";
import { agentWallet } from "@/lib/agent-wallet";
import { env } from "@/lib/env";
import { readSecret, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OwnerApiKeys() {
  const owner = await requireOwner();
  const [agents, mcpSecret, ownerKey] = await Promise.all([
    agentWallet.listAgents(owner.walletOwnerId),
    readSecret("mcpKey"),
    readSecret("ownerKey"),
  ]);
  const [freshAgentId, freshKey] = mcpSecret ? [mcpSecret.slice(0, mcpSecret.indexOf(":")), mcpSecret.slice(mcpSecret.indexOf(":") + 1)] : [null, null];
  const freshAgent = agents.find((a) => a.id === freshAgentId);

  return (
    <>
      <PageHeader title="API keys" description="Las URLs de conector de tus agentes y la clave de tu cuenta." />

      {freshAgent && freshKey && (
        <SecretBanner
          title={`URL del conector · ${freshAgent.name}`}
          note="Cópiala ahora: solo se muestra una vez. En Claude: Configuración → Conectores → Agregar conector personalizado, y pégala. Lleva la clave del agente adentro: no la compartas."
          value={`${env.AGENT_WALLET_MCP_URL}/${freshKey}`}
        />
      )}
      {ownerKey && (
        <SecretBanner
          title="Nueva clave de tu cuenta"
          note="Cópiala ahora: solo se muestra una vez. Es para iniciar sesión en el dashboard, no para Claude."
          value={ownerKey}
        />
      )}

      <Card title="Conectores MCP de tus agentes">
        <p className="mb-4 text-sm text-muted">
          Cada agente tiene su propia clave (<span className="font-mono">fpk_…</span>) dentro de la URL del conector. Solo guardamos su huella, por eso
          la URL se muestra una vez. Al generar una nueva, la anterior deja de funcionar.
        </p>
        {agents.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no tienes agentes. <Link href="/agents" className="font-medium text-brand">Registra uno</Link>.
          </p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg font-mono text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Agente</th>
                  <th className="px-5 py-2.5 font-medium">URL del conector</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3">
                      <Link href={`/agents/${a.id}`} className="font-medium hover:text-brand">{a.name}</Link>
                      <p className="font-mono text-[11px] text-muted">{a.wallet_address}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{env.AGENT_WALLET_MCP_URL}/fpk_••••••••</td>
                    <td className="px-5 py-3 text-right">
                      <form action={rotateMcpKeyAction}>
                        <input type="hidden" name="agentId" value={a.id} />
                        <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink hover:opacity-90">
                          Generar URL
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Clave de tu cuenta" action={<form action={rotateOwnerKeyAction}><button className="text-xs font-medium text-muted hover:text-ink">Regenerar</button></form>}>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-bg px-3 py-2 font-mono text-sm">ok_••••••••••••••••{owner.apiKeyLast4}</code>
          <p className="text-sm text-muted">Solo sirve para iniciar sesión en este dashboard. No la pegues en Claude.</p>
        </div>
      </Card>
    </>
  );
}
