import { CoffeeBag } from "@/lib/look";
import { getProducts, storeUrl, type Product } from "@/lib/flupay";

export const dynamic = "force-dynamic";

async function loadProducts(): Promise<Product[] | null> {
  try {
    return await getProducts();
  } catch {
    return null;
  }
}

export default async function Home() {
  const products = await loadProducts();
  const base = storeUrl();
  const example = products?.[0];

  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-leaf">Café de especialidad · Antioquia</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight md:text-6xl">
            Del cafetal a tu taza, <span className="italic text-roast">sin intermediarios.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Tostamos cada semana en Medellín. Y ahora también le vendemos a los agentes de IA: tu asistente puede comprar por ti y pagarnos directo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#cafes" className="rounded-full bg-espresso px-6 py-3 text-sm font-medium text-cream hover:bg-roast">Ver cafés</a>
            <a href="#agentes" className="rounded-full border border-espresso/30 px-6 py-3 text-sm font-medium hover:bg-paper">Soy un agente de IA</a>
          </div>
        </div>
        <div className="flex justify-center gap-2 rounded-[2rem] bg-paper p-10 shadow-sm ring-1 ring-line">
          <CoffeeBag index={0} name="Café" />
          <CoffeeBag index={1} name="Café" />
          <CoffeeBag index={2} name="Café" />
        </div>
      </section>

      <section id="cafes" className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="font-serif text-3xl font-semibold">Nuestros cafés</h2>
        {products === null ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-6 text-muted">
            La tienda todavía no está registrada en FluPay. Regístrala en useflupay.space como negocio con el nombre &quot;Café Andino&quot;.
          </p>
        ) : products.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-6 text-muted">
            Aún no hay productos. Créalos en el dashboard de FluPay → Productos.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <article key={p.id} className="flex flex-col rounded-3xl bg-paper p-6 ring-1 ring-line">
                <div className="flex justify-center rounded-2xl bg-cream py-6"><CoffeeBag index={i} name={p.name} /></div>
                <h3 className="mt-5 font-serif text-xl font-semibold">{p.name}</h3>
                {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className="font-mono text-lg font-semibold">{p.price}</span>
                  <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-medium text-leaf">Disponible para agentes</span>
                </div>
                <p className="mt-3 truncate font-mono text-[11px] text-muted">id: {p.id}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="agentes" className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-[2rem] bg-espresso p-8 text-cream md:p-12">
          <p className="text-sm font-medium uppercase tracking-widest text-[#d9a35b]">Para agentes de IA</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold">Tu agente puede comprarnos solo.</h2>
          <p className="mt-3 max-w-2xl text-cream/75">
            Aceptamos pagos de agentes con Open Payments. El checkout responde <span className="font-mono">402 Payment Required</span>, el agente paga desde su
            wallet (dentro del tope que aprobó su dueño) y recibe la orden. El dinero llega directo a nuestra wallet.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Catálogo (gratis)", `GET ${base}/api/productos`],
              ["Checkout (402)", `POST ${base}/api/checkout`],
              ["Instrucciones", `GET ${base}/llms.txt`],
            ].map(([t, v]) => (
              <div key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-cream/60">{t}</p>
                <p className="mt-1 break-all font-mono text-xs">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-black/30 p-5 font-mono text-xs leading-relaxed text-cream/90">
            <p className="text-cream/50">// Pídele a Claude con el conector de FluPay:</p>
            <p className="mt-1">&quot;Cómprame {example?.name ?? "un café"} en Café Andino ({base}/api/checkout)&quot;</p>
            <p className="mt-3 text-cream/50">// o directamente con la tool</p>
            <p>
              paid_fetch(url=&quot;{base}/api/checkout&quot;, method=&quot;POST&quot;, body=&apos;{`{"product_id":"${example?.id ?? "<id>"}"}`}&apos;, max_price=&quot;
              {example?.price.split(" ")[0] ?? "<precio>"}&quot;)
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
