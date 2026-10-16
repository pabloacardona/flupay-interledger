import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FluPay",
  description: "Let AI agents buy from your store. HTTP 402 payments on Open Payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-md bg-brand text-sm font-bold text-brand-ink">F</span>
              FluPay
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/docs" className="text-muted hover:text-ink">Docs</Link>
              <Link href="/dashboard" className="text-muted hover:text-ink">Dashboard</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Built on Open Payments · Interledger test network
        </footer>
      </body>
    </html>
  );
}
