import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Café Andino · Café de especialidad",
  description: "Café de especialidad de Antioquia. Los agentes de IA pueden comprar con Open Payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-line bg-paper/70 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-semibold">
              <span className="text-2xl">☕</span> Café Andino
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/#cafes" className="hover:text-roast">Cafés</Link>
              <Link href="/#agentes" className="hover:text-roast">Para agentes</Link>
              <Link href="/pedidos" className="rounded-full bg-espresso px-4 py-2 text-cream hover:bg-roast">Pedidos</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="mt-20 border-t border-line py-8 text-center text-xs text-muted">
          Café Andino · Medellín, Colombia · Tienda de demostración · Pagos de agentes con FluPay y Open Payments (red de prueba)
        </footer>
      </body>
    </html>
  );
}
