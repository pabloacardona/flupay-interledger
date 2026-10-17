# @flupay/store · Café Andino

Demo merchant at **https://tienda.useflupay.space**: a small coffee shop that sells to people and to AI agents. It shows what a real business integration with FluPay looks like; the backend only calls the charges API with the store's `sk_` key.

| Route | What it does |
| --- | --- |
| `/` | Storefront (products from the FluPay dashboard) and agent instructions |
| `/pedidos` | Agent orders, live |
| `GET /api/productos` | Free catalog for agents |
| `POST /api/checkout` | `{ product_id }` → 402 with `Payment-Required`; with `Authorization: OpenPayments <url>` → verified once, order confirmed |
| `/llms.txt` | How agents buy here |

Env: `FLUPAY_SECRET_KEY` (the store's merchant key), `FLUPAY_API_URL` (default `https://useflupay.space`), `STORE_PUBLIC_URL`.
