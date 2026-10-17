// The store's integration with FluPay through the hosted store endpoints.
// No API key needed: FluPay identifies the store by its slug (from the merchant name),
// creates the Open Payments charges on the store's wallet and verifies payments.

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
}

export interface Order {
  id: string;
  product: string | null;
  price: string;
  status: "pending" | "paid" | "consumed" | "expired";
  created_at: string;
  paid_at: string | null;
}

export const flupayUrl = () => process.env.FLUPAY_API_URL ?? "https://useflupay.space";
/** Store slug in FluPay: "Café Andino" registers as "cafe-andino". */
export const storeSlug = () => process.env.FLUPAY_STORE_SLUG ?? "cafe-andino";
export const storeUrl = () => process.env.STORE_PUBLIC_URL ?? "http://localhost:3002";
const hosted = (path: string) => `${flupayUrl()}/api/stores/${storeSlug()}${path}`;

/** null when the store is not registered in FluPay yet. */
export async function getProducts(): Promise<Product[] | null> {
  const res = await fetch(hosted("/products"), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FluPay catalog ${res.status}`);
  return ((await res.json()) as { products: Product[] }).products;
}

export async function getOrders(): Promise<Order[] | null> {
  const res = await fetch(hosted("/orders"), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FluPay orders ${res.status}`);
  return ((await res.json()) as { orders: Order[] }).orders;
}

/** Forwards the agent's checkout to FluPay; keeps the payment headers (402 / receipt). */
export async function forwardCheckout(request: Request, body: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  for (const name of ["authorization", "x-agent-id"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const res = await fetch(hosted("/checkout"), { method: "POST", headers, body, cache: "no-store" });
  const out = new Headers({ "content-type": "application/json" });
  for (const name of ["payment-required", "payment-receipt"]) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(await res.text(), { status: res.status, headers: out });
}
