import Link from "next/link";
import { SignUpForm } from "@/components/forms";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crea tu cuenta de negocio</h1>
        <p className="mt-1 text-sm text-muted">
          Necesitas una wallet de Open Payments. En la red de prueba:{" "}
          <a className="underline" href="https://wallet.interledger-test.dev" target="_blank" rel="noreferrer">wallet.interledger-test.dev</a>
        </p>
      </div>
      <SignUpForm />
      <p className="text-sm text-muted">
        ¿Ya tienes cuenta? <Link className="font-medium text-brand" href="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
