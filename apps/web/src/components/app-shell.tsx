import type { ReactNode } from "react";
import { logOut } from "@/app/actions";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { Logo } from "./sparkle";

/** Dashboard frame shared by merchants and agent owners. */
export function AppShell({
  nav,
  role,
  title,
  subtitle,
  children,
}: {
  nav: NavItem[];
  role: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
        <div className="mb-1 flex items-center gap-2 px-3 text-lg font-semibold tracking-tight">
          <Logo className="size-6" /> FluPay
        </div>
        <p className="mb-6 px-3 font-mono text-[10px] uppercase tracking-wider text-brand">{role}</p>
        <SidebarNav items={nav} />
        <div className="mt-auto px-3">
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Red de prueba</p>
            <p className="mt-1 text-xs">Pagos en wallets de prueba de Interledger.</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-bg/80 px-6 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate font-mono text-[11px] text-muted">{subtitle}</p>
          </div>
          <form action={logOut}>
            <button className="rounded-lg bg-[#ededea] px-3 py-1.5 text-sm hover:bg-[#e3e3df]">Cerrar sesión</button>
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
