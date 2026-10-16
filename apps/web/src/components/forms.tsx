"use client";

import { useActionState } from "react";
import { addProduct, logIn, signUp, type FormState } from "@/app/actions";

const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-sm font-medium mb-1.5";
const button =
  "w-full sm:w-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:opacity-90 disabled:opacity-50 disabled:cursor-wait";

function ErrorText({ state }: { state: FormState }) {
  return state.error ? <p className="text-sm text-bad">{state.error}</p> : null;
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label} htmlFor="name">Nombre del negocio</label>
        <input className={input} id="name" name="name" placeholder="Café Andino" required />
      </div>
      <div>
        <label className={label} htmlFor="email">Correo (opcional)</label>
        <input className={input} id="email" name="email" type="email" placeholder="hola@cafeandino.co" />
      </div>
      <div>
        <label className={label} htmlFor="walletAddress">Wallet address de Open Payments</label>
        <input className={input} id="walletAddress" name="walletAddress" placeholder="$ilp.interledger-test.dev/tu-tienda" required />
        <p className="mt-1.5 text-xs text-muted">Los pagos de los agentes llegan aquí directo. FluPay nunca toca tu dinero.</p>
      </div>
      <ErrorText state={state} />
      <button className={`${button} sm:w-full`} disabled={pending}>{pending ? "Conectando wallet…" : "Crear cuenta de negocio"}</button>
    </form>
  );
}

export function LogInForm() {
  const [state, action, pending] = useActionState(logIn, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label} htmlFor="apiKey">Clave secreta</label>
        <input className={`${input} font-mono`} id="apiKey" name="apiKey" placeholder="sk_… u ok_…" required autoComplete="off" />
      </div>
      <ErrorText state={state} />
      <button className={`${button} sm:w-full`} disabled={pending}>{pending ? "Entrando…" : "Iniciar sesión"}</button>
    </form>
  );
}

export function ProductForm({ currency }: { currency: string }) {
  const [state, action, pending] = useActionState(addProduct, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
      <div>
        <label className={label} htmlFor="p-name">Producto</label>
        <input className={input} id="p-name" name="name" placeholder="Café de origen 250 g" required />
      </div>
      <div>
        <label className={label} htmlFor="p-desc">Descripción</label>
        <input className={input} id="p-desc" name="description" placeholder="Tostión media, Huila" />
      </div>
      <div>
        <label className={label} htmlFor="p-price">Precio ({currency})</label>
        <input className={input} id="p-price" name="price" inputMode="decimal" placeholder="200" required />
      </div>
      <button className={button} disabled={pending}>{pending ? "Agregando…" : "Agregar"}</button>
      <div className="sm:col-span-4"><ErrorText state={state} /></div>
    </form>
  );
}
