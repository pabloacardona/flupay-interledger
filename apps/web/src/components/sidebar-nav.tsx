"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Resumen", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/dashboard/products", label: "Productos", icon: "M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7" },
  { href: "/dashboard/charges", label: "Cobros", icon: "M3 6h18v12H3zM3 10h18" },
  { href: "/dashboard/developers", label: "Desarrolladores", icon: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" },
];

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.href === "/dashboard" ? path === item.href : path.startsWith(item.href);
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
