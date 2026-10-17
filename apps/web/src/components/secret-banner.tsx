import { dismissOwnerSecrets } from "@/app/agents/actions";
import { CopyButton } from "./copy-button";

export function SecretBanner({ title, note, value }: { title: string; note: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand bg-brand-soft p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink/70">{note}</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm">{value}</code>
        <CopyButton value={value} />
      </div>
      <form action={dismissOwnerSecrets} className="mt-3">
        <button className="text-sm font-medium text-brand">Ya la guardé →</button>
      </form>
    </div>
  );
}
