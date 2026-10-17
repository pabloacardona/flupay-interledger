# @flupay/store · Café Andino

Demo merchant at **https://tienda.useflupay.space**: a small coffee shop that sells to people and to AI agents. It needs no keys or setup: it finds its products, checkout and orders in FluPay by its store slug (`cafe-andino`, from the merchant name "Café Andino"), using FluPay's hosted store endpoints.

| Route | What it does |
| --- | --- |
| `/` | Storefront (products from the FluPay dashboard) and agent instructions |
| `/pedidos` | Agent orders, live |
| `GET /api/productos` | Free catalog for agents |
| `POST /api/checkout` | `{ product_id }` → 402 with `Payment-Required`; with `Authorization: OpenPayments <url>` → verified once, order confirmed |
| `/llms.txt` | How agents buy here |

Optional env: `FLUPAY_STORE_SLUG` (default `cafe-andino`), `FLUPAY_API_URL` (default `https://useflupay.space`), `STORE_PUBLIC_URL`.
