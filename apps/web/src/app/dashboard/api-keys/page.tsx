import { regenerateApiKey } from "@/app/actions";
import { NewKeyBanner } from "@/components/new-key-banner";
import { Card, PageHeader } from "@/components/ui";
import { readNewApiKey, requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MerchantApiKeys() {
  const merchant = await requireMerchant();
  const newKey = await readNewApiKey();
  return (
    <>
      <PageHeader title="API keys" description="La clave secreta de tu negocio para la API de cobros." />
      {newKey && <NewKeyBanner apiKey={newKey} />}
      <Card title="Clave secreta" action={<form action={regenerateApiKey}><button className="text-xs font-medium text-muted hover:text-ink">Regenerar</button></form>}>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-bg px-3 py-2 font-mono text-sm">sk_••••••••••••••••{merchant.apiKeyLast4}</code>
          <p className="text-sm text-muted">
            Envíala como <code className="font-mono">Authorization: Bearer sk_…</code> desde tu backend. También es tu inicio de sesión. Al
            regenerarla, la anterior deja de funcionar.
          </p>
        </div>
      </Card>
    </>
  );
}
