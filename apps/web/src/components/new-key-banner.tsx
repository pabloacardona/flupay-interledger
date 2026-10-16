import { dismissNewKey } from "@/app/actions";
import { CopyButton } from "./copy-button";

export function NewKeyBanner({ apiKey }: { apiKey: string }) {
  return (
    <div className="rounded-xl border border-brand bg-brand-soft p-5">
      <p className="font-semibold">Tu API key secreta</p>
      <p className="mt-1 text-sm text-ink/70">Cópiala ahora. Solo se muestra una vez y también es con la que inicias sesión.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm">{apiKey}</code>
        <CopyButton value={apiKey} />
      </div>
      <form action={dismissNewKey} className="mt-3">
        <button className="text-sm font-medium text-brand">Ya la guardé →</button>
      </form>
    </div>
  );
}
