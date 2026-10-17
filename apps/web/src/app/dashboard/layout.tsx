import { AppShell } from "@/components/app-shell";
import { MERCHANT_NAV } from "@/components/sidebar-nav";
import { requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const merchant = await requireMerchant();
  return (
    <AppShell nav={MERCHANT_NAV} role="Negocio" title={merchant.name} subtitle={`${merchant.walletAddress} · ${merchant.assetCode}`}>
      {children}
    </AppShell>
  );
}
