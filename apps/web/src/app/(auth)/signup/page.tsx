import Link from "next/link";
import { SignUpForm } from "@/components/forms";
import { OwnerSignUpForm } from "@/components/owner-forms";

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { tipo } = await searchParams;
  const isOwner = tipo === "agente";
  const tab = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-center text-sm transition ${active ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">¿Vendes a agentes o tienes agentes que compran?</p>
      </div>
      <div className="flex gap-1 rounded-xl bg-[#ededea] p-1">
        <Link href="/signup" className={tab(!isOwner)}>Soy un negocio</Link>
        <Link href="/signup?tipo=agente" className={tab(isOwner)}>Tengo un agente</Link>
      </div>
      {isOwner ? (
        <OwnerSignUpForm />
      ) : (
        <>
          <p className="text-sm text-muted">
            Necesitas una wallet de Open Payments. En la red de prueba:{" "}
            <a className="underline" href="https://wallet.interledger-test.dev" target="_blank" rel="noreferrer">wallet.interledger-test.dev</a>
          </p>
          <SignUpForm />
        </>
      )}
      <p className="text-sm text-muted">
        ¿Ya tienes cuenta? <Link className="font-medium text-brand" href="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
