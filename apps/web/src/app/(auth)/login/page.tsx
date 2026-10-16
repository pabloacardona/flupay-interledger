import Link from "next/link";
import { LogInForm } from "@/components/forms";

export default function LogInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">Usa tu clave secreta: sk_… si eres un negocio, ok_… si tienes agentes.</p>
      </div>
      <LogInForm />
      <p className="text-sm text-muted">
        ¿Tienda nueva? <Link className="font-medium text-brand" href="/signup">Crea tu cuenta de negocio</Link>
      </p>
    </div>
  );
}
