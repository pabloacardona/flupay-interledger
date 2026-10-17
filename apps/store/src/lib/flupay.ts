// The store's backend integration with FluPay: plain HTTP calls to the charges API
// with the store's secret key. This is all a merchant needs to sell to AI agents.

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  active: boolean;
}

export interface Charge {
  id: string;
  status: "pending" | "paid" | "consumed" | "expired";
  price: string;
  description: string | null;
  product_id: string | null;
  incoming_url: string;
  payment_required: string;
  created_at?: string;
  paid_at: string | null;
  consumed_at: string | null;
  expires_at: string;
}

export class FlupayNotConfigured extends Error {}

function config() {
  const url = process.env.FLUPAY_API_URL ?? "https://useflupay.space";
  const key = process.env.FLUPAY_SECRET_KEY;
  if (!key) throw new FlupayNotConfigured("FLUPAY_SECRET_KEY is not set");
  return { url, key };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const res = await fetch(`${url}${path}`, {
    ...init,
    cache: "no-store",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`FluPay ${path} ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body as T;
}

export const flupay = {
  products: async () => (await call<Product[]>("/api/v1/products")).filter((p) => p.active),
  charges: () => call<Charge[]>("/api/v1/charges"),
  createCharge: (productId: string, agentHint?: string) =>
    call<Charge>("/api/v1/charges", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, agent_hint: agentHint, reference: `cafe-andino:${productId}` }),
    }),
  verify: (authorization: string, productId: string) =>
    call<{ valid: boolean; reason: string | null; charge: Charge | null }>("/api/v1/charges/verify", {
      method: "POST",
      body: JSON.stringify({ authorization, product_id: productId }),
    }),
};

export const isConfigured = () => Boolean(process.env.FLUPAY_SECRET_KEY);
export const storeUrl = () => process.env.STORE_PUBLIC_URL ?? "http://localhost:3002";
