import { AppShell } from "@/components/app-shell";
import { OWNER_NAV } from "@/components/sidebar-nav";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AgentsLayout({ children }: LayoutProps<"/agents">) {
  const owner = await requireOwner();
  return (
    <AppShell nav={OWNER_NAV} role="Dueño de agentes" title={owner.name} subtitle={owner.email ?? `Clave ok_…${owner.apiKeyLast4}`}>
      {children}
    </AppShell>
  );
}
