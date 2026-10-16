import Link from "next/link";
import { revokeCapAction, rotateMcpKeyAction } from "@/app/agents/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { BudgetBar } from "@/components/budget-bar";
import { CopyButton } from "@/components/copy-button";
import { ApproveCapForm } from "@/components/owner-forms";
import { SecretBanner } from "@/components/secret-banner";
import { Card, LiveDot, PageHeader } from "@/components/ui";
import { agentWallet, type ActivityEvent } from "@/lib/agent-wallet";
import { env } from "@/lib/env";
import { ownedAgent } from "@/lib/owners";
import { readSecret, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

const paymentStatus: Record<string, [string, string]> = {
  quoted: ["Cotizado", "bg-[#efefec] text-muted"],
  sent: ["Enviado", "bg-[#fff6e5] text-warn"],
  completed: ["Completado", "bg-[#e8f6ee] text-ok"],
  rejected_budget: ["Rechazado por tope", "bg-[#fdecea] text-bad"],
  failed: ["Fallido", "bg-[#fdecea] text-bad"],
};

function describe(e: ActivityEvent): { text: string; tone: string } {
  const d = (e.detail ?? {}) as Record<string, unknown>;
  switch (e.step) {
    case "request": return { text: `${d.method ?? "GET"} ${d.url ?? ""}`, tone: "text-muted" };
    case "payment_required": return { text: `402 · el comercio cobra ${d.price}`, tone: "text-warn" };
    case "quote_created": return { text: `Cotización: se debitarán ${d.debit}`, tone: "text-ink" };
    case "payment_sent": return { text: `Pago enviado: ${d.amount}`, tone: "text-ink" };
    case "payment_completed": return { text: "Pago completado en Open Payments", tone: "text-ok" };
    case "payment_reused": return { text: "Cobro ya pagado: no se cobra de nuevo", tone: "text-ok" };
    case "budget_exceeded": return { text: `Tope superado (gastado ${d.spent}). No se cobró nada`, tone: "text-bad" };
    case "payment_rejected": return { text: `Rechazado: ${d.error}`, tone: "text-bad" };
    case "response": return { text: `Respuesta ${d.status}`, tone: Number(d.status) < 400 ? "text-ok" : "text-warn" };
    default: return { text: e.step, tone: "text-muted" };
  }
}

export default async function AgentDetail({ params, searchParams }: PageProps<"/agents/[id]">) {
  const owner = await requireOwner();
  const { id } = await params;
  const { grant } = await searchParams;
  const agent = await ownedAgent(owner, id);
  const [payments, activity, mcpSecret] = await Promise.all([
    agentWallet.payments(id),
    agentWallet.activity(id),
    readSecret("mcpKey"),
  ]);
  const freshKey = mcpSecret?.startsWith(`${id}:`) ? mcpSecret.slice(id.length + 1) : null;
  const key = freshKey ?? "fpk_…";
  const claudeCode = `claude mcp add --transport http flupay ${env.AGENT_WALLET_MCP_URL} --header "x-agent-key: ${key}"`;
  const desktop = JSON.stringify(
    { mcpServers: { flupay: { command: "npx", args: ["-y", "mcp-remote", env.AGENT_WALLET_MCP_URL, "--header", `x-agent-key:${key}`] } } },
    null,
    2,
  );

  return (
    <>
      <AutoRefresh intervalMs={2500} />
      <Link href="/agents" className="text-sm text-muted hover:text-ink">← Mis agentes</Link>
      <PageHeader title={agent.name} description={`${agent.wallet_address} · máximo por compra ${agent.max_price}`} />

      {grant === "active" && <p className="rounded-xl border border-ok/30 bg-[#e8f6ee] p-4 text-sm text-ok">Tope aprobado. El agente ya puede pagar.</p>}
      {(grant === "rejected" || grant === "error") && (
        <p className="rounded-xl border border-bad/30 bg-[#fdecea] p-4 text-sm text-bad">No se aprobó el tope. Puedes intentarlo de nuevo.</p>
      )}
      {freshKey && (
        <SecretBanner
          title="Clave MCP del agente"
          note="Cópiala ahora: solo se muestra una vez. Con ella el agente se conecta a su wallet y puede pagar."
          value={freshKey}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Tope de gasto"
          action={
            agent.balance.status === "active" ? (
              <form action={revokeCapAction}>
                <input type="hidden" name="agentId" value={agent.id} />
                <button className="text-xs font-medium text-bad">Revocar</button>
              </form>
            ) : undefined
          }
        >
          <BudgetBar balance={agent.balance} />
          {agent.balance.status !== "active" && (
            <div className="mt-5"><ApproveCapForm agentId={agent.id} currency={agent.asset_code} /></div>
          )}
        </Card>

        <Card
          title="Conectar por MCP"
          action={
            <form action={rotateMcpKeyAction}>
              <input type="hidden" name="agentId" value={agent.id} />
              <button className="text-xs font-medium text-muted hover:text-ink">Nueva clave</button>
            </form>
          }
        >
          <p className="text-sm text-muted">Claude Code:</p>
          <div className="mt-2 flex items-start gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg bg-bg px-3 py-2 font-mono text-xs">{claudeCode}</code>
            <CopyButton value={claudeCode} />
          </div>
          <p className="mt-4 text-sm text-muted">Claude Desktop (claude_desktop_config.json):</p>
          <div className="mt-2 flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-bg px-3 py-2 font-mono text-xs">{desktop}</pre>
            <CopyButton value={desktop} />
          </div>
          {!freshKey && <p className="mt-3 text-xs text-muted">Reemplaza fpk_… por la clave del agente. Si la perdiste, genera una nueva.</p>}
        </Card>
      </div>

      <Card title="Actividad del agente" action={<LiveDot />}>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Cuando el agente use paid_fetch, aquí ves cada paso: 402, cotización, pago y respuesta.</p>
        ) : (
          <ol className="space-y-1.5 font-mono text-xs">
            {[...activity].reverse().slice(0, 40).map((e, i) => {
              const { text, tone } = describe(e);
              return (
                <li key={`${e.at}-${i}`} className="flex gap-3">
                  <span className="shrink-0 text-muted">{e.at.slice(11, 19)}</span>
                  <span className="shrink-0 text-muted">{e.requestId.slice(0, 6)}</span>
                  <span className={`min-w-0 break-all ${tone}`}>{text}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card title="Pagos">
        {payments.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay pagos.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg font-mono text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Hora</th>
                  <th className="px-5 py-2.5 font-medium">Destino</th>
                  <th className="px-5 py-2.5 font-medium">Precio</th>
                  <th className="px-5 py-2.5 font-medium">Debitado</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => {
                  const [label, style] = paymentStatus[p.status] ?? [p.status, ""];
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{p.created_at.slice(5, 10)} {p.created_at.slice(11, 19)}</td>
                      <td className="max-w-xs truncate px-5 py-3 font-mono text-xs">{p.target_url}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono">{p.price}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono">{p.debit ?? "—"}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
