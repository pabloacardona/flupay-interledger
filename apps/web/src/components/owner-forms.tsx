"use client";

import { useActionState } from "react";
import { approveCapAction, createAgentAction, signUpOwner } from "@/app/agents/actions";

const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-sm font-medium mb-1.5";
const button =
  "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:opacity-90 disabled:opacity-50 disabled:cursor-wait";

function ErrorText({ error }: { error?: string }) {
  return error ? <p className="text-sm text-bad">{error}</p> : null;
}

export function OwnerSignUpForm() {
  const [state, action, pending] = useActionState(signUpOwner, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label} htmlFor="o-name">Tu nombre</label>
        <input className={input} id="o-name" name="name" placeholder="Kevin" required />
      </div>
      <div>
        <label className={label} htmlFor="o-email">Correo (opcional)</label>
        <input className={input} id="o-email" name="email" type="email" placeholder="tu@correo.com" />
      </div>
      <p className="text-xs text-muted">Después registras tus agentes con su wallet y apruebas cuánto pueden gastar.</p>
      <ErrorText error={state.error} />
      <button className={`${button} w-full`} disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta para mis agentes"}</button>
    </form>
  );
}

export function CreateAgentForm() {
  const [state, action, pending] = useActionState(createAgentAction, {});
  return (
    <form action={action} className="grid gap-3 lg:grid-cols-[1fr_1.4fr_10rem_auto] lg:items-end">
      <div>
        <label className={label} htmlFor="a-name">Nombre del agente</label>
        <input className={input} id="a-name" name="name" placeholder="Asistente de compras" required />
      </div>
      <div>
        <label className={label} htmlFor="a-wallet">Wallet del agente</label>
        <input className={input} id="a-wallet" name="walletAddress" placeholder="$ilp.interledger-test.dev/mi-agente" required />
      </div>
      <div>
        <label className={label} htmlFor="a-max">Máximo por compra</label>
        <input className={input} id="a-max" name="maxPrice" inputMode="decimal" placeholder="500" required />
      </div>
      <button className={button} disabled={pending}>{pending ? "Registrando…" : "Registrar agente"}</button>
      <div className="lg:col-span-4">
        <ErrorText error={state.error} />
        <p className="text-xs text-muted">El máximo por compra va en la moneda de la wallet del agente. El agente nunca paga más que esto por una sola compra.</p>
      </div>
    </form>
  );
}

export function ApproveCapForm({ agentId, currency }: { agentId: string; currency: string }) {
  const [state, action, pending] = useActionState(approveCapAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="agentId" value={agentId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label className={label} htmlFor="c-budget">Tope ({currency})</label>
          <input className={input} id="c-budget" name="budget" inputMode="decimal" placeholder="800" required />
        </div>
        <div>
          <label className={label} htmlFor="c-period">Periodo</label>
          <select className={input} id="c-period" name="period" defaultValue="P1M">
            <option value="P1D">Por día</option>
            <option value="P1W">Por semana</option>
            <option value="P1M">Por mes</option>
          </select>
        </div>
        <button className={button} disabled={pending}>{pending ? "Abriendo wallet…" : "Aprobar tope en la wallet"}</button>
      </div>
      <ErrorText error={state.error} />
      <p className="text-xs text-muted">Te llevamos a la wallet del agente para que apruebes el permiso. La wallet hace cumplir el tope, no FluPay.</p>
    </form>
  );
}
