"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  /** SVG path for a 24x24 stroke icon. */
  icon: string;
  /** Match only the exact path (for section roots). */
  exact?: boolean;
}

export const MERCHANT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: "M3 12l9-8 9 8M5 10v10h14V10", exact: true },
  { href: "/dashboard/products", label: "Productos", icon: "M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7" },
  { href: "/dashboard/charges", label: "Cobros", icon: "M3 6h18v12H3zM3 10h18" },
  { href: "/dashboard/developers", label: "Desarrolladores", icon: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" },
];

export const OWNER_NAV: NavItem[] = [
  { href: "/agents", label: "Mis agentes", icon: "M12 3a4 4 0 110 8 4 4 0 010-8zM4 21c0-4 4-6 8-6s8 2 8 6" },
];

export function SidebarNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition ${
              active ? "bg-surface font-medium text-ink shadow-sm ring-1 ring-line" : "text-muted hover:bg-[#ededea] hover:text-ink"
            }`}
          >
            <svg viewBox="0 0 24 24" className={`size-4 ${active ? "text-brand" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
