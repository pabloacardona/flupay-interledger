import { logOut } from "@/app/actions";
import { SidebarNav } from "@/components/sidebar-nav";
import { Logo } from "@/components/sparkle";
import { requireMerchant } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const merchant = await requireMerchant();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3 text-lg font-semibold tracking-tight">
          <Logo className="size-6" /> FluPay
        </div>
        <SidebarNav />
        <div className="mt-auto space-y-3 px-3">
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Test network</p>
            <p className="mt-1 text-xs">Payments on Interledger test wallets.</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-bg/80 px-6 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{merchant.name}</p>
            <p className="truncate font-mono text-[11px] text-muted">{merchant.walletAddress} · {merchant.assetCode}</p>
          </div>
          <form action={logOut}>
            <button className="rounded-lg bg-[#ededea] px-3 py-1.5 text-sm hover:bg-[#e3e3df]">Sign out</button>
          </form>
        </header>
        <main className="relative flex-1">
          <div className="bg-cells pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent)]" aria-hidden />
          <div className="relative mx-auto max-w-6xl space-y-6 px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
